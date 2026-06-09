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
  "module",
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
const moduleFileDirectories = {
  hook: "hooks",
  lib: "lib",
  service: "services",
};
const sidecarDirectories = {
  domain: "domains",
  hook: "hooks",
  lib: "lib",
  module: "modules",
  service: "services",
};

const sidecarIcons = {
  domain: "🏢",
  hook: "🪝",
  lib: "📚",
};

const subdomainDirectories = [
  "components",
  "modules",
  "hooks",
  "services",
  "state",
  "models",
  "events",
  "helpers",
  "api",
  "pages",
];
const moduleDirectories = ["components", "hooks", "services", "lib"];

const appendUniqueLine = ({ filePath, line }) => {
  const content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  if (content.split("\n").includes(line)) return;

  fs.appendFileSync(filePath, `${content ? "\n" : ""}${line}`);
};

const createDocumentedSource = ({
  extension,
  name,
  targetDir,
  title,
  type,
}) => {
  const sourcePath = path.join(targetDir, `${name}.${extension}`);
  const documentationPath = path.join(targetDir, `${name}.mdx`);

  if (!fs.existsSync(sourcePath)) {
    fs.writeFileSync(
      sourcePath,
      `export const ${name} = () => {}\n\nexport default ${name}\n`,
    );
  }

  if (!fs.existsSync(documentationPath)) {
    fs.writeFileSync(
      documentationPath,
      [
        "import { Meta, Source } from '@storybook/addon-docs/blocks'",
        `import source from './${name}.${extension}?raw'`,
        "",
        `<Meta title="${title}" />`,
        "",
        `Add Documentation for ${type} / ${name} here.`,
        "",
        `<Source code={ source } language="${extension}" />`,
        "",
      ].join("\n"),
    );
  }
};

const getRemoveNameCandidates = (name) =>
  [name.trim(), convertToPascalCase(name), convertToCamelCase(name)].filter(
    Boolean,
  );

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

const cleanBucketNames = new Set([
  ...Object.values(atomicTypeDirectories),
  ...Object.values(scopedFileDirectories),
  "lib",
  "modules",
]);

const isCleanReferenceFile = (filePath) =>
  !isBarrelFile(filePath) &&
  !/\.(mock|stories|test)\.[^.]+$/.test(path.basename(filePath));

const containsNameReference = ({ content, name }) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`(^|[^A-Za-z0-9_$])${escapedName}([^A-Za-z0-9_$]|$)`).test(
    content,
  );
};

const getCleanRoots = (componentsDir) =>
  [
    componentsDir,
    getSidecarDir({ componentsDir, type: "domain" }),
    getSidecarDir({ componentsDir, type: "hook" }),
    getSidecarDir({ componentsDir, type: "lib" }),
    getSidecarDir({ componentsDir, type: "module" }),
    getSidecarDir({ componentsDir, type: "service" }),
  ].filter((item, index, items) => items.indexOf(item) === index);

const isGeneratedItemDirectory = (dir) => {
  const parentName = path.basename(path.dirname(dir));

  if (cleanBucketNames.has(parentName)) return true;

  const childNames = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);

  return childNames.includes("components") || childNames.includes("modules");
};

export const scanUnusedGeneratedArtifacts = ({ componentsDir }) => {
  const sourceRoot = path.dirname(componentsDir);
  const roots = getCleanRoots(componentsDir);
  const allFiles = visibleFilesRecursive(sourceRoot);
  const referenceFiles = allFiles.filter(isCleanReferenceFile);
  const directories = roots
    .flatMap((root) => visibleDirectoriesRecursive(root))
    .filter(isGeneratedItemDirectory)
    .filter((dir) => {
      const name = path.basename(dir);

      return !referenceFiles
        .filter((filePath) => !filePath.startsWith(`${dir}${path.sep}`))
        .some((filePath) =>
          containsNameReference({
            content: fs.readFileSync(filePath, "utf8"),
            name,
          }),
        );
    })
    .filter(
      (dir, _index, items) =>
        !items.some(
          (parent) => parent !== dir && dir.startsWith(`${parent}${path.sep}`),
        ),
    )
    .sort();
  const files = roots
    .flatMap((root) => visibleFilesRecursive(root))
    .filter((filePath) => {
      const parentName = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath);

      return (
        cleanBucketNames.has(parentName) &&
        !isBarrelFile(filePath) &&
        !/\.(mock|stories|test)\.[^.]+$/.test(fileName)
      );
    })
    .filter(
      (filePath) =>
        !directories.some((dir) => filePath.startsWith(`${dir}${path.sep}`)),
    )
    .filter((filePath) => {
      const name = path.basename(filePath).split(".")[0];

      return !referenceFiles
        .filter((referencePath) => referencePath !== filePath)
        .some((referencePath) =>
          containsNameReference({
            content: fs.readFileSync(referencePath, "utf8"),
            name,
          }),
        );
    })
    .sort();

  return { directories, files };
};

export const cleanUnusedGeneratedArtifacts = ({
  componentsDir,
  directories = [],
  files = [],
}) => {
  const targets = [...files, ...directories].sort(
    (left, right) => right.split(path.sep).length - left.split(path.sep).length,
  );

  targets.forEach((target) => {
    fs.rmSync(target, { recursive: true, force: true });
    check(`🧹 ${target}`);
  });

  getCleanRoots(componentsDir).forEach((dir) =>
    removeBarrelReferences({
      dir,
      names: targets.map((target) => path.basename(target).split(".")[0]),
    }),
  );

  return targets;
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
  const typesDir = path.join(dir, "_types_");

  fs.ensureDirSync(typesDir);

  if (extension) {
    fs.ensureFileSync(
      path.join(typesDir, `index.${getLogicExtension(extension)}`),
    );
  }

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
    appendUniqueLine({
      filePath: componentsIndex,
      line: "export * from './_types_'",
    });
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
    getSidecarDir({ componentsDir, type: "module" }),
    getSidecarDir({ componentsDir, type: "service" }),
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

export const getModuleDir = ({ componentsDir, moduleName }) =>
  path.join(getSidecarDir({ componentsDir, type: "module" }), moduleName);

export const getScopedModuleDir = ({
  componentsDir,
  domainName,
  moduleName,
  subdomainName,
}) => {
  if (subdomainName) {
    return path.join(
      getSubdomainDir({ componentsDir, domainName, subdomainName }),
      "modules",
      moduleName,
    );
  }

  if (domainName) {
    return path.join(
      getSidecarDir({ componentsDir, type: "domain" }),
      domainName,
      "modules",
      moduleName,
    );
  }

  return getModuleDir({ componentsDir, moduleName });
};

export const getModuleComponentsDir = ({
  componentsDir,
  domainName,
  moduleName,
  subdomainName,
}) =>
  path.join(
    getScopedModuleDir({
      componentsDir,
      domainName,
      moduleName,
      subdomainName,
    }),
    "components",
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

  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir,
    title: `${displayType}/${name}`,
    type,
  });
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
  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir: domainDir,
    title: `domains/${name}`,
    type: "domain",
  });
  appendUniqueLine({
    filePath: path.join(domainDir, `index.${logicExtension}`),
    line: `export { default } from './${name}'`,
  });
  appendUniqueLine({
    filePath: domainsIndex,
    line: `export * as ${name} from './${name}'`,
  });

  check(`🏢 domains/${name}`);
  check(`🏢 domains/${name}/index.${logicExtension}`);
  check(`🏢 domains/index.${logicExtension}`);
};

export const createModuleFiles = ({
  allowExisting = false,
  componentsDir,
  domainName,
  extension,
  name,
  scss = false,
  subdomainName,
}) => {
  const logicExtension = getLogicExtension(extension);
  let modulesDir = getSidecarDir({ componentsDir, type: "module" });

  if (subdomainName) {
    createSubdomainFiles({
      allowExisting: true,
      componentsDir,
      domainName,
      extension,
      name: subdomainName,
      scss,
    });
    modulesDir = path.join(
      getSubdomainDir({ componentsDir, domainName, subdomainName }),
      "modules",
    );
  } else if (domainName) {
    const domainsDir = getSidecarDir({ componentsDir, type: "domain" });
    const domainDir = path.join(domainsDir, domainName);

    fs.ensureDirSync(domainDir, 0o744);
    fs.ensureFileSync(path.join(domainsDir, `index.${logicExtension}`));
    fs.ensureFileSync(path.join(domainDir, `index.${logicExtension}`));
    createDocumentedSource({
      extension: logicExtension,
      name: domainName,
      targetDir: domainDir,
      title: `domains/${domainName}`,
      type: "domain",
    });
    appendUniqueLine({
      filePath: path.join(domainsDir, `index.${logicExtension}`),
      line: `export * as ${domainName} from './${domainName}'`,
    });
    appendUniqueLine({
      filePath: path.join(domainDir, `index.${logicExtension}`),
      line: `export { default } from './${domainName}'`,
    });
    appendUniqueLine({
      filePath: path.join(domainDir, `index.${logicExtension}`),
      line: "export * from './modules'",
    });
    modulesDir = path.join(domainDir, "modules");
  }

  const moduleDir = getScopedModuleDir({
    componentsDir,
    domainName,
    moduleName: name,
    subdomainName,
  });
  const modulesIndex = path.join(modulesDir, `index.${logicExtension}`);

  if (fs.existsSync(moduleDir) && !allowExisting) {
    error(`modules/${name} exists`);
  }

  fs.ensureDirSync(moduleDir, 0o744);
  fs.ensureFileSync(modulesIndex);
  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir: moduleDir,
    title: [
      ...(domainName
        ? ["domains", domainName, ...(subdomainName ? [subdomainName] : [])]
        : []),
      "modules",
      name,
    ].join("/"),
    type: "module",
  });
  appendUniqueLine({
    filePath: modulesIndex,
    line: `export * as ${name} from './${name}'`,
  });

  moduleDirectories.forEach((subdir) => {
    fs.ensureDirSync(path.join(moduleDir, subdir), 0o744);
    fs.ensureFileSync(path.join(moduleDir, subdir, `index.${logicExtension}`));
  });
  createAtomicDirs({
    dir: getModuleComponentsDir({
      componentsDir,
      domainName,
      moduleName: name,
      subdomainName,
    }),
    extension,
    scss,
  });

  fs.writeFileSync(
    path.join(moduleDir, `index.${logicExtension}`),
    [
      `export { default } from './${name}'`,
      ...moduleDirectories.map((subdir) => `export * from './${subdir}'`),
      "",
    ].join("\n"),
  );

  check(`📦 modules/${name}`);
  check(`📦 modules/${name}/index.${logicExtension}`);
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
  createDocumentedSource({
    extension: logicExtension,
    name: domainName,
    targetDir: domainDir,
    title: `domains/${domainName}`,
    type: "domain",
  });
  appendUniqueLine({
    filePath: domainIndex,
    line: `export { default } from './${domainName}'`,
  });
  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir: subdomainDir,
    title: `domains/${domainName}/${name}`,
    type: "subdomain",
  });
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
    [
      `export { default } from './${name}'`,
      ...subdomainDirectories.map((subdir) => `export * from './${subdir}'`),
      "",
    ].join("\n"),
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
  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir,
    title: `domains/${domainName}/${subdomainName}/${folder}/${name}`,
    type,
  });
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

export const createScopedModuleFiles = ({
  componentsDir,
  domainName,
  extension,
  moduleName,
  name,
  scss = false,
  subdomainName,
  type,
}) => {
  const logicExtension = getLogicExtension(extension);
  const moduleDir = getScopedModuleDir({
    componentsDir,
    domainName,
    moduleName,
    subdomainName,
  });
  const folder = moduleFileDirectories[type];

  if (!folder || type === "page") {
    error(`${type} cannot be created as a module sidecar`);
  }

  createModuleFiles({
    allowExisting: true,
    componentsDir,
    domainName,
    extension,
    name: moduleName,
    scss,
    subdomainName,
  });

  const baseDir = path.join(moduleDir, folder);
  const targetDir = path.join(baseDir, name);
  const folderIndex = path.join(baseDir, `index.${logicExtension}`);

  if (fs.existsSync(targetDir)) {
    error(`modules/${moduleName}/${folder}/${name} exists`);
  }

  fs.ensureDirSync(targetDir, 0o744);
  fs.ensureFileSync(folderIndex);
  createDocumentedSource({
    extension: logicExtension,
    name,
    targetDir,
    title: [
      ...(domainName
        ? ["domains", domainName, ...(subdomainName ? [subdomainName] : [])]
        : []),
      "modules",
      moduleName,
      folder,
      name,
    ].join("/"),
    type,
  });
  fs.writeFileSync(
    path.join(targetDir, `index.${logicExtension}`),
    `export { default } from './${name}'\n`,
  );
  appendUniqueLine({
    filePath: folderIndex,
    line: `export { default as ${name} } from './${name}'`,
  });

  check(`📦 modules/${moduleName}/${folder}/${name}/${name}.${logicExtension}`);
  check(`📦 modules/${moduleName}/${folder}/${name}/index.${logicExtension}`);
  check(`📦 modules/${moduleName}/${folder}/index.${logicExtension}`);
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
