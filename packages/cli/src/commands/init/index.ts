import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import getConfig from "~/commands/init/getConfig";
import initOptionsSchema from "~/commands/init/initOptionsSchema";
import installDependencies from "~/commands/init/installDependencies";
import writeFiles from "~/commands/init/writeFiles";
import { handleError } from "~/utils/handle-error";
import { logger } from "~/utils/logger";

// TODO: use jotai atoms for options and config
export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-d, --defaults,", "use default configuration.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .action(async (opts) => {
    try {
      const options = initOptionsSchema.parse(opts);
      const { cwd } = options;
      const config = await getConfig(options);

      const spinner = ora(`Initializing project...`)?.start();
      await writeFiles(config);
      spinner?.succeed();

      const dependenciesSpinner = ora(`Installing dependencies...`)?.start();
      await installDependencies(cwd, config);
      dependenciesSpinner?.succeed();

      logger.info("");
      logger.info(
        `${chalk.green(
          "Success!",
        )} Project initialization completed. You may now add components.`,
      );
      logger.info("");
    } catch (error) {
      handleError(error);
    }
  });
