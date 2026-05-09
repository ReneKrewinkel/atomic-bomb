import fs from "fs-extra";
import { z } from "zod";
import { convertToPascalCase } from "./case.js";
import { error } from "./logger.js";

const configSchema = z.object({
  search: z.string(),
  extension: z.string().optional(),
  platform: z.string(),
  destination: z.string(),
  scss: z.boolean(),
});

export const readAppConfig = (appPackagePath) => {
  const packageJson = JSON.parse(fs.readFileSync(appPackagePath, "utf8"));

  return {
    name: packageJson.name,
    banner: convertToPascalCase(packageJson.name.replace("-", " ")),
    version: packageJson.version,
    author: packageJson.author,
    templateRepository: packageJson.config.templates,
  };
};

export const createDotFile = ({ dotFilePath, platform, templatePath }) => {
  if (fs.existsSync(dotFilePath)) return;

  writeDotFile({ dotFilePath, platform, templatePath });
};

export const writeDotFile = ({ dotFilePath, platform, templatePath }) => {
  const config = fs.readFileSync(`${templatePath}/${platform}.json`, "utf-8");
  fs.writeFileSync(dotFilePath, config);
};

export const readDotFile = (dotFilePath) => {
  if (!fs.existsSync(dotFilePath)) return false;

  try {
    const result = fs.readFileSync(dotFilePath, "utf-8");
    const config = JSON.parse(result);
    const parsedConfig = configSchema.parse(config);

    return {
      ...parsedConfig,
      extension: parsedConfig.extension || "js",
      scss: parsedConfig.scss || false,
    };
  } catch (err) {
    let message = err.message;

    if (err instanceof z.ZodError) {
      message =
        "\n\t - " +
        err.issues
          .map((item) => `${item.path[0]}: ${item.message}`.toLowerCase())
          .join("\n\t - ");
    }

    error(`.atomic-bomb: oops: ${message}`);
  }
};
