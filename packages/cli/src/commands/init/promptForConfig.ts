import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";

import type { Config } from "~/utils/get-config";
import {
  DEFAULT_COMPONENTS,
  DEFAULT_TAILWIND_CONFIG,
  DEFAULT_TAILWIND_CSS,
  DEFAULT_UTILS,
  rawConfigSchema,
  resolveConfigPaths,
} from "~/utils/get-config";
import { logger } from "~/utils/logger";
import { getRegistryBaseColors, getRegistryStyles } from "~/utils/registry";

export async function promptForConfig(
  cwd: string,
  defaultConfig: Config | null = null,
  skip = false,
) {
  const highlight = (text: string) => chalk.cyan(text);

  const styles = await getRegistryStyles();
  const baseColors = await getRegistryBaseColors();

  const options = await prompts([
    {
      type: "select",
      name: "style",
      message: `Which ${highlight("style")} would you like to use?`,
      choices: styles.map((style) => ({
        title: style.label,
        value: style.name,
      })),
    },
    {
      type: "select",
      name: "tailwindBaseColor",
      message: `Which color would you like to use as ${highlight(
        "base color",
      )}?`,
      choices: baseColors.map((color) => ({
        title: color.label,
        value: color.name,
      })),
    },
    {
      type: "text",
      name: "tailwindCss",
      message: `Where is your ${highlight("global CSS")} file?`,
      initial: defaultConfig?.tailwind.css ?? DEFAULT_TAILWIND_CSS,
    },
    {
      type: "toggle",
      name: "tailwindCssVariables",
      message: `Would you like to use ${highlight(
        "CSS variables",
      )} for colors?`,
      initial: defaultConfig?.tailwind.cssVariables ?? true,
      active: "yes",
      inactive: "no",
    },
    {
      type: "text",
      name: "tailwindPrefix",
      message: `Are you using a custom ${highlight(
        "tailwind prefix eg. tw-",
      )}? (Leave blank if not)`,
      initial: "",
    },
    {
      type: "text",
      name: "tailwindConfig",
      message: `Where is your ${highlight("tailwind.config.js")} located?`,
      initial: defaultConfig?.tailwind.config ?? DEFAULT_TAILWIND_CONFIG,
    },
    {
      type: "text",
      name: "components",
      message: `Configure the import alias for ${highlight("components")}:`,
      initial: defaultConfig?.aliases["components"] ?? DEFAULT_COMPONENTS,
    },
    {
      type: "text",
      name: "utils",
      message: `Configure the import alias for ${highlight("utils")}:`,
      initial: defaultConfig?.aliases["utils"] ?? DEFAULT_UTILS,
    },
    {
      type: "toggle",
      name: "rsc",
      message: `Are you using ${highlight("React Server Components")}?`,
      initial: defaultConfig?.rsc ?? true,
      active: "yes",
      inactive: "no",
    },
  ]);

  const config = rawConfigSchema.parse({
    $schema: "https://ui.shadcn.com/schema.json",
    style: options.style,
    tailwind: {
      config: options.tailwindConfig,
      css: options.tailwindCss,
      baseColor: options.tailwindBaseColor,
      cssVariables: options.tailwindCssVariables,
      prefix: options.tailwindPrefix,
    },
    rsc: options.rsc,
    aliases: {
      utils: options.utils,
      components: options.components,
    },
  });

  if (!skip) {
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: `Write configuration to ${highlight(
        "components.json",
      )}. Proceed?`,
      initial: true,
    });

    if (!proceed) {
      process.exit(0);
    }
  }

  // Write to file.
  logger.info("");
  const spinner = ora(`Writing components.json...`).start();
  const targetPath = path.resolve(cwd, "components.json");
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf8");
  spinner.succeed();

  return await resolveConfigPaths(cwd, config);
}

export async function promptForMinimalConfig(
  cwd: string,
  defaultConfig: Config,
  defaults = false,
) {
  const highlight = (text: string) => chalk.cyan(text);
  let style = defaultConfig.style;
  let baseColor = defaultConfig.tailwind.baseColor;
  let cssVariables = defaultConfig.tailwind.cssVariables;

  if (!defaults) {
    const styles = await getRegistryStyles();
    const baseColors = await getRegistryBaseColors();

    const options = await prompts([
      {
        type: "select",
        name: "style",
        message: `Which ${highlight("style")} would you like to use?`,
        choices: styles.map((style) => ({
          title: style.label,
          value: style.name,
        })),
      },
      {
        type: "select",
        name: "tailwindBaseColor",
        message: `Which color would you like to use as ${highlight(
          "base color",
        )}?`,
        choices: baseColors.map((color) => ({
          title: color.label,
          value: color.name,
        })),
      },
      {
        type: "toggle",
        name: "tailwindCssVariables",
        message: `Would you like to use ${highlight(
          "CSS variables",
        )} for colors?`,
        initial: defaultConfig?.tailwind.cssVariables,
        active: "yes",
        inactive: "no",
      },
    ]);

    style = options.style;
    baseColor = options.tailwindBaseColor;
    cssVariables = options.tailwindCssVariables;
  }

  const config = rawConfigSchema.parse({
    $schema: defaultConfig?.$schema,
    style,
    tailwind: {
      ...defaultConfig?.tailwind,
      baseColor,
      cssVariables,
    },
    rsc: defaultConfig?.rsc,
    aliases: defaultConfig?.aliases,
  });

  // Write to file.
  logger.info("");
  const spinner = ora(`Writing components.json...`).start();
  const targetPath = path.resolve(cwd, "components.json");
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf8");
  spinner.succeed();

  return await resolveConfigPaths(cwd, config);
}
