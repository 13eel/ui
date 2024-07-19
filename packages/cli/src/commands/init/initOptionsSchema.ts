import { existsSync, promises as fs } from "fs";
import path from "path";
import { z } from "zod";

const initOptionsSchema = z.object({
  cwd: z
    .string()
    .transform((cwd) => path.resolve(cwd))
    // Ensure target directory exists.
    .refine(existsSync, {
      message: "The path passed in cwd does not exist. Please try again",
    }),
  yes: z.boolean(),
  defaults: z.boolean(),
});

export default initOptionsSchema;

export type InitOptions = z.infer<typeof initOptionsSchema>;