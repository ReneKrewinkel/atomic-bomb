import path from "node:path";
import * as url from "node:url";

export const packageRoot = path.resolve(
  url.fileURLToPath(new URL("..", import.meta.url)),
);

export const appPackagePath = path.join(packageRoot, "package.json");
export const templatePath = path.join(packageRoot, "templates");
export const workflowTemplatePath = path.join(
  packageRoot,
  "workflows",
  "atomic-todo-to-issue.yml",
);

export const projectPackagePath = "./package.json";
export const projectDotFilePath = "./.atomic-bomb";
