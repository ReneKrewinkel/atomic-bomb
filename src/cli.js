import chalk from "chalk";
import figlet from "figlet";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { convertNameForType, convertToPascalCase } from "./case.js";
import {
  createDotFile,
  readAppConfig,
  readDotFile,
  writeDotFile,
} from "./config.js";
import { error, showCopyright } from "./logger.js";
import {
  appPackagePath,
  projectDotFilePath,
  projectPackagePath,
  templatePath,
  workflowTemplatePath,
} from "./paths.js";
import {
  checkAndCreateDir,
  checkPackageJson,
  checkPlatformDependency,
  createAtomicDirs,
  createComponentDir,
  createSidecarFiles,
  createScopedSubdomainFiles,
  createSubdomainFiles,
  createWorkflow,
  getScopedComponentsDir,
  isAtomicType,
  validComponentTypes,
} from "./project.js";
import {
  checkPlatform,
  processTemplates,
  pullPlatforms,
  pullTemplateRepository,
} from "./templates.js";
import {
  readGenerationStructure,
  writeGenerationStructure,
} from "./structure.js";

const usage = ({ appName, platforms }) => {
  const message = `USAGE: ${appName} \n\t--platform ${platforms.join("|")} \n\t--type ${validComponentTypes.join("|")} \n\t--name [NAME](,[NAME],[NAME])\n\t--type subdomain --for [DOMAINNAME] --name [NAME](,[NAME],[NAME])\n\t--for [DOMAINNAME]/[SUBDOMAIN] --type [TYPE] --name [NAME]\n\t--export [FILENAME]\n\t--from [FILENAME]\n`;
  console.log(chalk.greenBright(`🤙 ${message}\n\nhttps://atomic-bomb.io`));
  process.exit(2);
};

const parseForTarget = (value) => {
  const parts = value
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length !== 2) return false;

  return {
    forDomain: convertToPascalCase(parts[0]),
    forSubdomain: convertToPascalCase(parts[1]),
  };
};

const scopedOnlyTypes = ["api", "event", "helper", "model", "service", "state"];

export const parseArgs = ({ args, appName, platforms, dotConfig = false }) => {
  const argv = yargs(hideBin(args))
    .option("platform", {
      alias: "p",
      type: "string",
    })
    .option("for", {
      type: "string",
    })
    .option("export", {
      type: "string",
    })
    .option("from", {
      type: "string",
    }).argv;

  try {
    if (argv.export && argv.from) usage({ appName, platforms });
    if (!argv.name && !argv.platform && !argv.export && !argv.from) {
      usage({ appName, platforms });
    }

    const platform = argv.platform
      ? argv.platform.toLowerCase()
      : dotConfig
        ? dotConfig.platform
        : "react";

    if (!platforms.includes(platform)) usage({ appName, platforms });

    if (argv.export) {
      return { exportFile: argv.export, platform };
    }

    if (argv.from) {
      return { fromFile: argv.from, platform };
    }

    if (!argv.name) {
      return { platform, type: null, names: [], platformOnly: true };
    }

    const type = argv.type ? argv.type.toLowerCase() : "atom";
    if (!validComponentTypes.includes(type)) usage({ appName, platforms });
    if (type === "subdomain" && !argv.for) usage({ appName, platforms });
    if (scopedOnlyTypes.includes(type) && !argv.for)
      usage({ appName, platforms });
    if (argv.for && type !== "subdomain" && !parseForTarget(argv.for)) {
      usage({ appName, platforms });
    }

    const names = argv.name
      .split(",")
      .map((item) => convertNameForType({ type, value: item }));

    return {
      ...(argv.for && type === "subdomain"
        ? { forDomain: convertToPascalCase(argv.for) }
        : {}),
      ...(argv.for && type !== "subdomain" ? parseForTarget(argv.for) : {}),
      platform,
      type,
      names,
    };
  } catch (err) {
    usage({ appName, platforms });
  }
};

const generateComponents = ({ appConfig, platform, type, names }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    checkPlatform({ platform, templatePath });
    createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath });
    createWorkflow({ workflowTemplatePath });

    const projectConfig = readDotFile(projectDotFilePath);
    checkPackageJson(projectPackagePath);
    checkPlatformDependency({
      packagePath: projectPackagePath,
      packageName: projectConfig.search,
    });
    checkAndCreateDir(projectConfig.destination);
    createAtomicDirs({
      dir: projectConfig.destination,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
    });

    names.forEach((name) => {
      const targetDir = `${projectConfig.destination}/${type}s/${name}`;
      createComponentDir({ name: `${type}/${name}`, dir: targetDir });
      processTemplates({
        platform,
        type,
        name,
        destination: targetDir,
        componentsDir: projectConfig.destination,
        extension: projectConfig.extension,
        scss: projectConfig.scss,
        templatePath,
      });
    });

    showCopyright(appConfig);
  });
};

const generateImportedItem = ({ item, platform, projectConfig }) => {
  if (item.for && item.type !== "subdomain") {
    generateScopedItem({
      domainName: item.forDomain,
      item,
      platform,
      projectConfig,
      subdomainName: item.forSubdomain,
    });
    return;
  }

  if (
    ["atom", "molecule", "organism", "page", "template"].includes(item.type)
  ) {
    const targetDir = `${projectConfig.destination}/${item.type}s/${item.name}`;

    createComponentDir({ name: `${item.type}/${item.name}`, dir: targetDir });
    processTemplates({
      platform,
      type: item.type,
      name: item.name,
      destination: targetDir,
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
      templatePath,
    });
    return;
  }

  if (["domain", "hook", "lib"].includes(item.type)) {
    createSidecarFiles({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      name: item.name,
      type: item.type,
    });
    return;
  }

  createSubdomainFiles({
    allowExisting: true,
    componentsDir: projectConfig.destination,
    domainName: item.for,
    extension: projectConfig.extension,
    name: item.name,
  });
};

const generateScopedItem = ({
  domainName,
  item,
  platform,
  projectConfig,
  subdomainName,
}) => {
  if (isAtomicType(item.type)) {
    const scopedComponentsDir = getScopedComponentsDir({
      componentsDir: projectConfig.destination,
      domainName,
      subdomainName,
    });
    const targetDir = `${scopedComponentsDir}/${item.type}s/${item.name}`;

    createSubdomainFiles({
      allowExisting: true,
      componentsDir: projectConfig.destination,
      domainName,
      extension: projectConfig.extension,
      name: subdomainName,
      scss: projectConfig.scss,
    });
    createAtomicDirs({
      dir: scopedComponentsDir,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
    });
    createComponentDir({
      name: `${domainName}/${subdomainName}/${item.type}/${item.name}`,
      dir: targetDir,
    });
    processTemplates({
      platform,
      type: item.type,
      name: item.name,
      destination: targetDir,
      componentsDir: scopedComponentsDir,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
      templatePath,
    });
    return;
  }

  createScopedSubdomainFiles({
    componentsDir: projectConfig.destination,
    domainName,
    extension: projectConfig.extension,
    name: item.name,
    scss: projectConfig.scss,
    subdomainName,
    type: item.type,
  });
};

const prepareProject = ({ platform, withAtomicDirs = false }) => {
  checkPlatform({ platform, templatePath });
  createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath });

  const projectConfig = readDotFile(projectDotFilePath);
  checkPackageJson(projectPackagePath);
  checkPlatformDependency({
    packagePath: projectPackagePath,
    packageName: projectConfig.search,
  });

  if (withAtomicDirs) {
    checkAndCreateDir(projectConfig.destination);
    createAtomicDirs({
      dir: projectConfig.destination,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
    });
  }

  return projectConfig;
};

const generateSidecar = ({ appConfig, platform, names, type }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    checkPlatform({ platform, templatePath });
    createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath });

    const projectConfig = readDotFile(projectDotFilePath);
    checkPackageJson(projectPackagePath);
    checkPlatformDependency({
      packagePath: projectPackagePath,
      packageName: projectConfig.search,
    });

    names.forEach((name) => {
      createSidecarFiles({
        componentsDir: projectConfig.destination,
        extension: projectConfig.extension,
        name,
        type,
      });
    });

    showCopyright(appConfig);
  });
};

const generateSubdomain = ({ appConfig, forDomain, names, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    checkPlatform({ platform, templatePath });
    createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath });

    const projectConfig = readDotFile(projectDotFilePath);
    checkPackageJson(projectPackagePath);
    checkPlatformDependency({
      packagePath: projectPackagePath,
      packageName: projectConfig.search,
    });

    names.forEach((name) => {
      createSubdomainFiles({
        componentsDir: projectConfig.destination,
        domainName: forDomain,
        extension: projectConfig.extension,
        name,
        scss: projectConfig.scss,
      });
    });

    showCopyright(appConfig);
  });
};

const generateScoped = ({
  appConfig,
  forDomain,
  forSubdomain,
  names,
  platform,
  type,
}) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    const projectConfig = prepareProject({ platform });

    names.forEach((name) => {
      generateScopedItem({
        domainName: forDomain,
        item: { name, type },
        platform,
        projectConfig,
        subdomainName: forSubdomain,
      });
    });

    showCopyright(appConfig);
  });
};

const configurePlatform = ({ appConfig, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    checkPlatform({ platform, templatePath });
    writeDotFile({ dotFilePath: projectDotFilePath, platform, templatePath });
    showCopyright(appConfig);
  });
};

const exportStructure = ({ appConfig, filePath, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    const projectConfig = prepareProject({ platform });
    writeGenerationStructure({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      filePath,
      platform: projectConfig.platform,
    });

    showCopyright(appConfig);
  });
};

const generateFromStructure = ({ appConfig, filePath, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message);

    console.log(chalk.green(`${data}`));

    const structure = readGenerationStructure(filePath);
    const projectConfig = prepareProject({ platform, withAtomicDirs: true });

    structure.items.forEach((item) => {
      generateImportedItem({ item, platform, projectConfig });
    });

    showCopyright(appConfig);
  });
};

export const runCli = (args = process.argv) => {
  const appConfig = readAppConfig(appPackagePath);

  pullTemplateRepository({
    templatePath,
    templateRepository: appConfig.templateRepository,
  });

  const platforms = pullPlatforms(templatePath);
  const options = parseArgs({
    args,
    appName: appConfig.name,
    platforms,
    dotConfig: readDotFile(projectDotFilePath),
  });

  if (options.platformOnly) {
    configurePlatform({ appConfig, platform: options.platform });
    return;
  }

  if (options.exportFile) {
    exportStructure({
      appConfig,
      filePath: options.exportFile,
      platform: options.platform,
    });
    return;
  }

  if (options.fromFile) {
    generateFromStructure({
      appConfig,
      filePath: options.fromFile,
      platform: options.platform,
    });
    return;
  }

  if (options.forSubdomain) {
    generateScoped({ appConfig, ...options });
    return;
  }

  if (["domain", "hook", "lib"].includes(options.type)) {
    generateSidecar({ appConfig, ...options });
    return;
  }

  if (options.type === "subdomain") {
    generateSubdomain({ appConfig, ...options });
    return;
  }

  generateComponents({ appConfig, ...options });
};
