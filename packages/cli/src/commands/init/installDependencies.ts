import { execa } from "execa";

import type { Config } from "~/utils/get-config";
import { getPackageManager } from "~/utils/get-package-manager";

const PROJECT_DEPENDENCIES = [
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "tailwindcss-animate",
];

export default async function installDependencies(cwd: string, config: Config) {
  const packageManager = await getPackageManager(cwd);

  // TODO: add support for other icon libraries.
  const deps = [
    ...PROJECT_DEPENDENCIES,
    config.style === "new-york" ? "@radix-ui/react-icons" : "lucide-react",
  ];

  await execa(
    packageManager,
    [packageManager === "npm" ? "install" : "add", ...deps],
    {
      cwd,
    },
  );
}
