import fs from "fs-extra";
import path from "node:path";
import { convertToCamelCase, convertToPascalCase } from "./case.js";
import { check, error } from "./logger.js";

export const validComponentTypes = [
  "api",
  "atom",
  "event",
  "helper",
  "molecule",
  "model",
  "organism",
  "template",
  "page",
  "lib",
  "hook",
  "domain",
  "service",
  "state",
  "subdomain",
];

const sidecarTypes = ["lib", "hook", "domain", "subdomain"];
const atomicTypes = ["atom", "molecule", "organism", "template"];
const atomicTypeDirectories = {
  atom: "atoms",
  molecule: "molecules",
  organism: "organisms",
  page: "pages",
  template: "templates",
};
const scopedFileDirectories = {
  api: "api",
  event: "events",
  helper: "helpers",
  hook: "hooks",
  model: "models",
  page: "pages",
  service: "services",
  state: "state",
};
const sidecarDirectories = {
  domain: "domains",
  hook: "hooks",
  lib: "lib",
};

const sidecarIcons = {
  domain: "🏢",
  hook: "🪝",
  lib: "📚",
};

const subdomainDirectories = [
  "components",
  "hooks",
  "services",
  "state",
  "models",
  "events",
  "helpers",
  "api",
  "pages",
];

const appendUniqueLine = ({ filePath, line }) => {
  const content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  if (content.split("\n").includes(line)) return;

  fs.appendFileSync(filePath, `${content ? "\n" : ""}${line}`);
};

const getRemoveNameCandidates = (name) =>
  [
    name.trim(),
    convertToPascalCase(name),
    convertToCamelCase(name),
  ].filter(Boolean);

const visibleDirectoriesRecursive = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => !item.name.startsWith("."))
    .flatMap((item) => {
      const itemPath = path.join(dir, item.name);

      if (!item.isDirectory()) return [];

      return [itemPath, ...visibleDirectoriesRecursive(itemPath)];
    });
};

const visibleFilesRecursive = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => !item.name.startsWith("."))
    .flatMap((item) => {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) return visibleFilesRecursive(itemPath);

      return itemPath;
    });
};

const isBarrelFile = (filePath) => {
  const fileName = path.basename(filePath);

  return /^index\.(j|t)sx?$/.test(fileName) || fileName === "_index.scss";
};

const removesNameReference = ({ line, names }) =>
  names.some(
    (name) =>
      line.includes(`from './${name}'`) ||
      line.includes(`from "./${name}"`) ||
      line.includes(`@use './${name}'`) ||
      line.includes(`@use "./${name}"`),
  );

const removeBarrelReferences = ({ dir, names }) => {
  visibleFilesRecursive(dir)
    .filter(isBarrelFile)
    .forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const nextContent = content
        .split("\n")
        .filter((line) => !removesNameReference({ line, names }))
        .join("\n");

      if (nextContent !== content) {
        fs.writeFileSync(filePath, nextContent);
        check(`🧹 ${filePath}`);
      }
    });
};

export const checkPackageJson = (packagePath) => {
  if (!fs.existsSync(packagePath)) {
    error(
      "package.json doesn't exist, please run atomic-bomb in the root of your project",
    );
  }

  check("package.json is available");
};

export const checkPlatformDependency = ({ packagePath, packageName }) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const dependencyGroups = [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.peerDependencies,
      packageJson.optionalDependencies,
    ];
    const installedVersion = dependencyGroups
      .filter(Boolean)
      .map((dependencies) => dependencies[packageName])
      .find(Boolean);

    if (!installedVersion) error(`${packageName} not installed`);

    check(`${packageName} ${installedVersion.replace("^", "")} is installed`);
  } catch (err) {
    error("Failure processing package.json");
  }
};

export const checkAndCreateDir = (dir) => {
  const displayDir = dir.replace("//", "/");
  fs.ensureDirSync(dir, 0o744);
  check(`${displayDir} directory present`);
};

export const createAtomicDirs = ({ dir, extension = false, scss }) => {
  Object.values(atomicTypeDirectories).forEach((item) => {
    const atomicDir = `${dir}/${item}`;
    fs.ensureDirSync(atomicDir);
    if (scss) fs.ensureFileSync(`${atomicDir}/_index.scss`, "");
    if (extension) fs.ensureFileSync(`${atomicDir}/index.${extension}`);
  });

  if (extension) {
    const componentsIndex = path.join(
      dir,
      `index.${getLogicExtension(extension)}`,
    );

    fs.ensureFileSync(componentsIndex);
    Object.values(atomicTypeDirectories).forEach((item) => {
      appendUniqueLine({
        filePath: componentsIndex,
        line: `export * from './${item}'`,
      });
    });
  }
};

export const createComponentDir = ({ name, dir }) => {
  if (fs.existsSync(dir)) error(`${name} Component exists`);

  checkAndCreateDir(dir);
};

export const createWorkflow = ({ workflowTemplatePath }) => {
  const workflowPath = "./.github/workflows/atomic-todo-to-issue.yml";

  if (fs.existsSync(workflowPath)) return;

  const result = fs.readFileSync(workflowTemplatePath, "utf-8");
  fs.ensureDirSync("./.github/workflows", 0o744);
  fs.writeFileSync(workflowPath, result);
};

export const removeGeneratedItem = ({ componentsDir, name }) => {
  const names = getRemoveNameCandidates(name);
  const roots = [
    componentsDir,
    getSidecarDir({ componentsDir, type: "domain" }),
    getSidecarDir({ componentsDir, type: "hook" }),
    getSidecarDir({ componentsDir, type: "lib" }),
  ].filter((item, index, items) => items.indexOf(item) === index);

  const targets = roots
    .flatMap((root) => visibleDirectoriesRecursive(root))
    .filter((dir) => names.includes(path.basename(dir)))
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort(
      (left, right) =>
        right.split(path.sep).length - left.split(path.sep).length,
    );

  if (targets.length === 0) error(`${name} not found`);

  targets.forEach((target) => {
    fs.rmSync(target, { recursive: true, force: true });
    check(`🗑️ ${target}`);
  });

  roots.forEach((dir) => removeBarrelReferences({ dir, names }));

  return targets;
};

export const getLibDir = (componentsDir) =>
  path.join(path.dirname(componentsDir), "lib");

export const getSidecarDir = ({ componentsDir, type }) =>
  path.join(path.dirname(componentsDir), sidecarDirectories[type] || type);

export const getSubdomainDir = ({ componentsDir, domainName, subdomainName }) =>
  path.join(
    getSidecarDir({ componentsDir, type: "domain" }),
    domainName,
    subdomainName,
  );

export const getLogicExtension = (extension) => {
  if (extension === "tsx") return "ts";
  if (extension === "jsx") return "js";

  return extension;
};

export const createSidecarFiles = ({
  componentsDir,
  extension,
  name,
  type,
}) => {
  if (type === "domain") {
    createDomainFiles({ componentsDir, extension, name });
    return;
  }

  const logicExtension = getLogicExtension(extension);
  const sidecarDir = getSidecarDir({ componentsDir, type });
  const displayType = sidecarDirectories[type] || type;
  const icon = sidecarIcons[type] || "◇";
  const targetDir = path.join(sidecarDir, name);

  if (fs.existsSync(targetDir)) error(`${displayType}/${name} exists`);

  fs.ensureDirSync(targetDir, 0o744);
  fs.ensureFileSync(path.join(sidecarDir, `index.${logicExtension}`));

  fs.writeFileSync(
    path.join(targetDir, `${name}.${logicExtension}`),
    `export const ${name} = () => {}\n\nexport default ${name}\n`,
  );
  fs.writeFileSync(
    path.join(targetDir, `index.${logicExtension}`),
    `export { default } from './${name}'\n`,
  );
  fs.appendFileSync(
    path.join(sidecarDir, `index.${logicExtension}`),
    `\nexport { default as ${name} } from './${name}'`,
  );

  check(`${icon} ${displayType}/${name}/${name}.${logicExtension}`);
  check(`${icon} ${displayType}/${name}/index.${logicExtension}`);
  check(`${icon} ${displayType}/index.${logicExtension}`);
};

export const createLibFiles = ({ componentsDir, extension, name }) =>
  createSidecarFiles({ componentsDir, extension, name, type: "lib" });

export const createDomainFiles = ({ componentsDir, extension, name }) => {
  const logicExtension = getLogicExtension(extension);
  const domainsDir = getSidecarDir({ componentsDir, type: "domain" });
  const domainDir = path.join(domainsDir, name);
  const domainsIndex = path.join(domainsDir, `index.${logicExtension}`);

  if (fs.existsSync(domainDir)) error(`domains/${name} exists`);

  fs.ensureDirSync(domainDir, 0o744);
  fs.ensureFileSync(domainsIndex);
  fs.ensureFileSync(path.join(domainDir, `index.${logicExtension}`));
  appendUniqueLine({
    filePath: domainsIndex,
    line: `export * as ${name} from './${name}'`,
  });

  check(`🏢 domains/${name}`);
  check(`🏢 domains/${name}/index.${logicExtension}`);
  check(`🏢 domains/index.${logicExtension}`);
};

export const createSubdomainFiles = ({
  allowExisting = false,
  componentsDir,
  domainName,
  extension,
  name,
  scss = false,
}) => {
  const logicExtension = getLogicExtension(extension);
  const domainsDir = getSidecarDir({ componentsDir, type: "domain" });
  const domainDir = path.join(domainsDir, domainName);
  const subdomainDir = path.join(domainDir, name);
  const domainsIndex = path.join(domainsDir, `index.${logicExtension}`);
  const domainIndex = path.join(domainDir, `index.${logicExtension}`);

  if (fs.existsSync(subdomainDir) && !allowExisting) {
    error(`domains/${domainName}/${name} exists`);
  }

  fs.ensureDirSync(domainsDir, 0o744);
  fs.ensureDirSync(domainDir, 0o744);
  fs.ensureDirSync(subdomainDir, 0o744);
  fs.ensureFileSync(domainsIndex);
  fs.ensureFileSync(domainIndex);
  appendUniqueLine({
    filePath: domainsIndex,
    line: `export * as ${domainName} from './${domainName}'`,
  });
  appendUniqueLine({
    filePath: domainIndex,
    line: `export * as ${name} from './${name}'`,
  });

  subdomainDirectories.forEach((subdir) => {
    fs.ensureDirSync(path.join(subdomainDir, subdir), 0o744);
    fs.ensureFileSync(
      path.join(subdomainDir, subdir, `index.${logicExtension}`),
    );
  });
  createAtomicDirs({
    dir: path.join(subdomainDir, "components"),
    extension,
    scss,
  });

  fs.writeFileSync(
    path.join(subdomainDir, `index.${logicExtension}`),
    `${subdomainDirectories
      .map((subdir) => `export * from './${subdir}'`)
      .join("\n")}\n`,
  );

  check(`🗄️ domains/${domainName}/${name}`);
  check(`🗄️ domains/${domainName}/${name}/index.${logicExtension}`);
};

export const createScopedSubdomainFiles = ({
  componentsDir,
  domainName,
  extension,
  name,
  scss = false,
  subdomainName,
  type,
}) => {
  const logicExtension = getLogicExtension(extension);
  const subdomainDir = getSubdomainDir({
    componentsDir,
    domainName,
    subdomainName,
  });
  const folder = scopedFileDirectories[type];

  if (!folder) error(`${type} cannot be created inside a subdomain`);

  createSubdomainFiles({
    allowExisting: true,
    componentsDir,
    domainName,
    extension,
    name: subdomainName,
    scss,
  });

  const baseDir = path.join(subdomainDir, folder);
  const targetDir = path.join(baseDir, name);
  const folderIndex = path.join(baseDir, `index.${logicExtension}`);

  if (fs.existsSync(targetDir)) {
    error(`domains/${domainName}/${subdomainName}/${folder}/${name} exists`);
  }

  fs.ensureDirSync(targetDir, 0o744);
  fs.ensureFileSync(folderIndex);
  fs.writeFileSync(
    path.join(targetDir, `${name}.${logicExtension}`),
    `export const ${name} = () => {}\n\nexport default ${name}\n`,
  );
  fs.writeFileSync(
    path.join(targetDir, `index.${logicExtension}`),
    `export { default } from './${name}'\n`,
  );
  appendUniqueLine({
    filePath: folderIndex,
    line: `export { default as ${name} } from './${name}'`,
  });

  check(
    `🗄️ domains/${domainName}/${subdomainName}/${folder}/${name}/${name}.${logicExtension}`,
  );
  check(
    `🗄️ domains/${domainName}/${subdomainName}/${folder}/${name}/index.${logicExtension}`,
  );
  check(
    `🗄️ domains/${domainName}/${subdomainName}/${folder}/index.${logicExtension}`,
  );
};

export const getScopedComponentsDir = ({
  componentsDir,
  domainName,
  subdomainName,
}) =>
  path.join(
    getSubdomainDir({ componentsDir, domainName, subdomainName }),
    "components",
  );

export const isAtomicType = (type) => atomicTypes.includes(type);
