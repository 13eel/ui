import { existsSync, promises as fs } from "fs";
import path from "path";
import { parse } from "@babel/core";
import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import ora from "ora";
import prompts from "prompts";
import { z } from "zod";

import { parseOptions } from "~/commands/add/parseOptions";
import { getExistingConfig } from "~/utils/get-config";
import { getPackageManager } from "~/utils/get-package-manager";
import { handleError } from "~/utils/handle-error";
import { logger } from "~/utils/logger";
import {
  fetchTree,
  getItemTargetPath,
  getRegistryBaseColor,
  getRegistryIndex,
  resolveTree,
} from "~/utils/registry";
import { transform } from "~/utils/transformers";
import { addOptionsSchema } from "./addOptionsSchema";

export const add = new Command()
  .name("add")
  .description("add a component to your project")
  .argument("[components...]", "the components to add")
  // Options
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-a, --all", "add all available components", false)
  .option("-p, --path <path>", "the path to add the component to.")
  // Action
  .action(async (components, opts) => {
    try {
      const { config, cwd, options } = await parseOptions({
        components,
        ...opts,
      });

      const registryIndex = await getRegistryIndex();

      let selectedComponents = options.all
        ? registryIndex.map((entry) => entry.name)
        : options.components;
      if (!options.components?.length && !options.all) {
        const { components } = await prompts({
          type: "multiselect",
          name: "components",
          message: "Which components would you like to add?",
          hint: "Space to select. A to toggle all. Enter to submit.",
          instructions: false,
          choices: registryIndex.map((entry) => ({
            title: entry.name,
            value: entry.name,
            selected: options.all
              ? true
              : options.components?.includes(entry.name),
          })),
        });
        selectedComponents = components;
      }

      if (!selectedComponents?.length) {
        logger.warn("No components selected. Exiting.");
        process.exit(0);
      }

      const tree = await resolveTree(registryIndex, selectedComponents);
      const payload = await fetchTree(config.style, tree);
      const baseColor = await getRegistryBaseColor(config.tailwind.baseColor);

      if (!payload.length) {
        logger.warn("Selected components not found. Exiting.");
        process.exit(0);
      }

      if (!options.yes) {
        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message: `Ready to install components and dependencies. Proceed?`,
          initial: true,
        });

        if (!proceed) {
          process.exit(0);
        }
      }

      const spinner = ora(`Installing components...`).start();
      for (const item of payload) {
        spinner.text = `Installing ${item.name}...`;
        const targetDir = await getItemTargetPath(
          config,
          item,
          options.path ? path.resolve(cwd, options.path) : undefined,
        );

        if (!targetDir) {
          continue;
        }

        if (!existsSync(targetDir)) {
          await fs.mkdir(targetDir, { recursive: true });
        }

        const existingComponent = item.files.filter((file) =>
          existsSync(path.resolve(targetDir, file.name)),
        );

        if (existingComponent.length && !options.overwrite) {
          if (selectedComponents.includes(item.name)) {
            spinner.stop();
            const { overwrite } = await prompts({
              type: "confirm",
              name: "overwrite",
              message: `Component ${item.name} already exists. Would you like to overwrite?`,
              initial: false,
            });

            if (!overwrite) {
              logger.info(
                `Skipped ${item.name}. To overwrite, run with the ${chalk.green(
                  "--overwrite",
                )} flag.`,
              );
              continue;
            }

            spinner.start(`Installing ${item.name}...`);
          } else {
            continue;
          }
        }

        for (const file of item.files) {
          let filePath = path.resolve(targetDir, file.name);

          // Run transformers.
          const content = await transform({
            filename: file.name,
            raw: file.content,
            config,
            baseColor,
          });

          if (!config.tsx) {
            filePath = filePath.replace(/\.tsx$/, ".jsx");
            filePath = filePath.replace(/\.ts$/, ".js");
          }

          await fs.writeFile(filePath, content);
        }

        const packageManager = await getPackageManager(cwd);

        // Install dependencies.
        if (item.dependencies?.length) {
          await execa(
            packageManager,
            [
              packageManager === "npm" ? "install" : "add",
              ...item.dependencies,
            ],
            {
              cwd,
            },
          );
        }

        // Install devDependencies.
        if (item.devDependencies?.length) {
          await execa(
            packageManager,
            [
              packageManager === "npm" ? "install" : "add",
              "-D",
              ...item.devDependencies,
            ],
            {
              cwd,
            },
          );
        }
      }
      spinner.succeed(`Done.`);
    } catch (error) {
      handleError(error);
    }
  });
