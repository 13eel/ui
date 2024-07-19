import { existsSync, promises as fs } from "fs";
import path from "path";
import template from "lodash.template";

import type { Config } from "~/utils/get-config";
import { getRegistryBaseColor } from "~/utils/registry";
import * as templates from "~/utils/templates";
import { applyPrefixesCss } from "~/utils/transformers/transform-tw-prefix";

export default async function writeFiles(config: Config) {
  await ensureResolvedPathsExist(config);

  const tailwindConfigTemplate = config.tailwind.cssVariables
    ? templates.TAILWIND_CONFIG_TS_WITH_VARIABLES
    : templates.TAILWIND_CONFIG_TS;

  // Write tailwind config.
  await fs.writeFile(
    config.resolvedPaths.tailwindConfig,
    template(tailwindConfigTemplate)({
      prefix: config.tailwind.prefix,
    }),
    "utf8",
  );

  // Write css file.
  const baseColor = await getRegistryBaseColor(config.tailwind.baseColor);
  if (baseColor) {
    await fs.writeFile(
      config.resolvedPaths.tailwindCss,
      config.tailwind.cssVariables
        ? config.tailwind.prefix
          ? applyPrefixesCss(baseColor.cssVarsTemplate, config.tailwind.prefix)
          : baseColor.cssVarsTemplate
        : baseColor.inlineColorsTemplate,
      "utf8",
    );
  }

  // Write cn file.
  await fs.writeFile(
    `${config.resolvedPaths.utils}.ts`,
    templates.UTILS,
    "utf8",
  );
}

async function ensureResolvedPathsExist(config: Config) {
  // Ensure all resolved paths directories exist.
  for (const [key, resolvedPath] of Object.entries(config.resolvedPaths)) {
    // Determine if the path is a file or directory.
    // TODO: is there a better way to do this?
    let dirname = path.extname(resolvedPath)
      ? path.dirname(resolvedPath)
      : resolvedPath;

    // If the utils alias is set to something like "~/lib/utils",
    // assume this is a file and remove the "utils" file name.
    // TODO: In future releases we should add support for individual utils.
    if (key === "utils" && resolvedPath.endsWith("/utils")) {
      // Remove /utils at the end.
      dirname = dirname.replace(/\/utils$/, "");
    }

    if (!existsSync(dirname)) {
      await fs.mkdir(dirname, { recursive: true });
    }
  }
}
