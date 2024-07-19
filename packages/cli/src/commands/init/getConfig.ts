import type { InitOptions } from "~/commands/init/initOptionsSchema";
import {
  promptForConfig,
  promptForMinimalConfig,
} from "~/commands/init/promptForConfig";
import { getExistingConfig } from "~/utils/get-config";
import { getProjectConfig, preFlight } from "~/utils/get-project-info";

export default async function getConfig(options: InitOptions) {
  const { cwd, yes, defaults } = options;

  preFlight(cwd);

  const projectConfig = await getProjectConfig(cwd);
  if (projectConfig) {
    return await promptForMinimalConfig(cwd, projectConfig, defaults);
  }

  //Read config
  const existingConfig = await getExistingConfig(cwd);
  return await promptForConfig(cwd, existingConfig, yes);
}
