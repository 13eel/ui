import { existsSync, promises as fs } from "fs";
import path from "path";
import chalk from "chalk";

import { addOptionsSchema } from "~/commands/add/addOptionsSchema";
import { getConfig } from "~/utils/get-config";
import { logger } from "~/utils/logger";

export async function parseOptions(rawOptions: unknown) {
  const options = addOptionsSchema.parse(rawOptions);
  const cwd = path.resolve(options.cwd);

  if (!existsSync(cwd)) {
    logger.error(`The path ${cwd} does not exist. Please try again.`);
    process.exit(1);
  }

  const config = await getConfig(cwd);
  if (!config) {
    logger.warn(
      `Configuration is missing. Please run ${chalk.green(
        `init`,
      )} to create a components.json file.`,
    );
    process.exit(1);
  }
  return { options, cwd, config } as const;
}
