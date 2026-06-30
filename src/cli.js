import chalk from 'chalk'
import figlet from 'figlet'
import fs from 'fs-extra'
import path from 'node:path'
import readline from 'node:readline/promises'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { promptAiConfig } from './ai-config.js'
import { runOpenAiCompatibleGeneration } from './ai-provider.js'
import { convertNameForType, convertToPascalCase } from './case.js'
import { createDotFile, readAppConfig, readDotFile, writeDotFile } from './config.js'
import { error, showCopyright } from './logger.js'
import {
  appPackagePath,
  projectDotFilePath,
  projectPackagePath,
  skillSourcePath,
  templatePath,
  workflowTemplatePath
} from './paths.js'
import {
  checkAndCreateDir,
  checkPackageJson,
  checkPlatformDependency,
  cleanUnusedGeneratedArtifacts,
  createAtomicDirs,
  createComponentDir,
  createModuleFiles,
  createScopedModuleFiles,
  createSidecarFiles,
  createScopedSubdomainFiles,
  createSubdomainFiles,
  createWorkflow,
  getModuleComponentsDir,
  getScopedModuleDir,
  getScopedComponentsDir,
  getSidecarDir,
  getSubdomainDir,
  isAtomicType,
  removeGeneratedItem,
  scanUnusedGeneratedArtifacts,
  validComponentTypes
} from './project.js'
import { checkPlatform, processTemplates, pullPlatforms, pullTemplateRepository } from './templates.js'
import { readGenerationStructure, writeGenerationStructure } from './structure.js'
import { getInstalledSkillIndex, installSkillBundleForAi } from './skills.js'

const usage = ({ appName, platforms }) => {
  const message = `USAGE: ${appName} \n\t--platform ${platforms.join('|')} \n\t--type ${validComponentTypes.join('|')} \n\t--name [NAME](,[NAME],[NAME])\n\t--type module --name [NAME](,[NAME],[NAME]) [--for DOMAIN[/SUBDOMAIN]]\n\t--module [MODULENAME] [--for DOMAIN[/SUBDOMAIN]] --type [TYPE] --name [NAME]\n\t--for [MODULENAME] --type [TYPE] --name [NAME]\n\t--type subdomain --for [DOMAINNAME] --name [NAME](,[NAME],[NAME])\n\t--for [DOMAINNAME]/[SUBDOMAIN] --type [TYPE] --name [NAME]\n\t--ai [--prompt PROMPT] [--validate]\n\t--remove [NAME]\n\t--clean\n\t--update\n\t--export [FILENAME]\n\t--from [FILENAME]\n`
  console.log(chalk.greenBright(`🤙 ${message}\n\nhttps://atomic-bomb.io`))
  process.exit(2)
}

const parseParentTarget = (value) => {
  const parts = value
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    return {
      forDomain: convertToPascalCase(parts[0])
    }
  }

  if (parts.length === 2) {
    return {
      forDomain: convertToPascalCase(parts[0]),
      forSubdomain: convertToPascalCase(parts[1])
    }
  }

  return false
}

const parseForTarget = (value) => {
  const parts = value
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    return {
      moduleName: convertToPascalCase(parts[0])
    }
  }

  if (parts.length !== 2) return false

  return {
    forDomain: convertToPascalCase(parts[0]),
    forSubdomain: convertToPascalCase(parts[1])
  }
}

const scopedOnlyTypes = ['api', 'event', 'helper', 'model', 'state']
const scopedTypeDirectories = {
  api: 'api',
  event: 'events',
  helper: 'helpers',
  hook: 'hooks',
  lib: 'lib',
  model: 'models',
  page: 'pages',
  service: 'services',
  state: 'state'
}
const moduleTypeDirectories = {
  hook: 'hooks',
  lib: 'lib',
  service: 'services'
}
const moduleComponentTypes = ['atom', 'molecule', 'organism', 'page', 'template']
const moduleScopedTypes = [...moduleComponentTypes, 'hook', 'lib', 'service']
const aiComponentTypes = ['atom', 'molecule', 'organism', 'page', 'template']
const aiDocumentedTypes = [
  'api',
  'domain',
  'event',
  'helper',
  'hook',
  'lib',
  'model',
  'module',
  'page',
  'service',
  'state',
  'subdomain'
]
const aiSupportedTypes = [...new Set([...aiComponentTypes, ...aiDocumentedTypes])]
const implementedAiProviders = ['openai', 'openai-compatible']

export const getAiUnavailableMessage = ({ aiConfig = false, options = {} }) => {
  if (!aiConfig?.enabled) {
    return 'AI generation requested, but no AI provider is configured. Run atomic-bomb -p and configure an AI provider first.'
  }

  if (!aiSupportedTypes.includes(options.type)) {
    return `AI generation currently supports ${aiSupportedTypes.join(', ')}. Remove --ai to scaffold ${options.type} normally.`
  }

  if (options.forSubdomain && !aiDocumentedTypes.includes(options.type)) {
    return 'AI generation for scoped subdomain components is not implemented yet. Remove --ai to scaffold normally.'
  }

  if (options.moduleName && moduleComponentTypes.includes(options.type)) {
    return 'AI generation for module components is not implemented yet. Remove --ai to scaffold normally.'
  }

  if (!implementedAiProviders.includes(aiConfig.provider)) {
    return `AI generation requested with provider "${aiConfig.provider}", but no provider adapter is implemented yet. Remove --ai to scaffold normally, or add an adapter for this provider.`
  }

  return false
}

export const parseArgs = ({ args, appName, platforms, dotConfig = false }) => {
  const argv = yargs(hideBin(args))
    .option('platform', {
      alias: 'p',
      type: 'string'
    })
    .option('for', {
      type: 'string'
    })
    .option('module', {
      type: 'string'
    })
    .option('export', {
      type: 'string'
    })
    .option('from', {
      type: 'string'
    })
    .option('remove', {
      type: 'string'
    })
    .option('clean', {
      type: 'boolean'
    })
    .option('update', {
      type: 'boolean'
    })
    .option('ai', {
      type: 'boolean'
    })
    .option('prompt', {
      type: 'string'
    })
    .option('validate', {
      type: 'boolean'
    }).argv

  try {
    const actionCount = [argv.export, argv.from, argv.remove, argv.clean, argv.update].filter(Boolean).length

    if (actionCount > 1 || ((argv.remove || argv.clean || argv.update) && argv.name)) {
      usage({ appName, platforms })
    }

    if ((argv.prompt || argv.validate) && !argv.ai) {
      usage({ appName, platforms })
    }

    if (!argv.name && !argv.platform && !argv.export && !argv.from && !argv.remove && !argv.clean && !argv.update) {
      usage({ appName, platforms })
    }

    const platform = argv.platform ? argv.platform.toLowerCase() : dotConfig ? dotConfig.platform : 'react'

    if (!platforms.includes(platform)) usage({ appName, platforms })

    if (argv.export) {
      return { exportFile: argv.export, platform }
    }

    if (argv.from) {
      return { fromFile: argv.from, platform }
    }

    if (argv.remove) {
      return { removeName: argv.remove, platform }
    }

    if (argv.clean) {
      return { clean: true, platform }
    }

    if (argv.update) {
      return { platform, updateSkills: true }
    }

    if (!argv.name) {
      return { platform, type: null, names: [], platformOnly: true }
    }

    const type = argv.type ? argv.type.toLowerCase() : 'atom'
    const forTarget = argv.for
      ? type === 'module' || argv.module
        ? parseParentTarget(argv.for)
        : parseForTarget(argv.for)
      : false
    if (!validComponentTypes.includes(type)) usage({ appName, platforms })
    if (type === 'subdomain' && !argv.for) usage({ appName, platforms })
    if (type === 'module' && argv.module) usage({ appName, platforms })
    if (scopedOnlyTypes.includes(type) && !argv.for && !argv.module) usage({ appName, platforms })
    if (argv.for && type === 'subdomain' && parseForTarget(argv.for)?.moduleName === undefined) {
      usage({ appName, platforms })
    }
    if (argv.for && type !== 'subdomain' && !forTarget) {
      usage({ appName, platforms })
    }
    if (
      type !== 'subdomain' &&
      type !== 'module' &&
      (argv.module || forTarget?.moduleName) &&
      !moduleScopedTypes.includes(type)
    ) {
      usage({ appName, platforms })
    }

    const names = argv.name.split(',').map((item) => convertNameForType({ type, value: item }))

    return {
      ...(argv.for && type === 'subdomain' ? { forDomain: convertToPascalCase(argv.for) } : {}),
      ...(argv.for && type !== 'subdomain' ? forTarget : {}),
      ...(argv.module ? { moduleName: convertToPascalCase(argv.module) } : {}),
      platform,
      type,
      names,
      ...(argv.ai
        ? {
            ai: true,
            ...(argv.prompt ? { prompt: argv.prompt } : {}),
            ...(argv.validate ? { validate: true } : {})
          }
        : {})
    }
  } catch (err) {
    usage({ appName, platforms })
  }
}

const renderBanner = (banner) =>
  new Promise((resolve) => {
    figlet(banner, (err, data) => {
      if (err) error(err.message)

      console.log(chalk.green(`${data}`))
      resolve()
    })
  })

const getComponentTargetDir = ({ componentsDir, name, type }) => `${componentsDir}/${type}s/${name}`

const scaffoldComponent = ({
  componentsDir,
  extension,
  name,
  platform,
  scss,
  storybookScope = [],
  type,
  targetDir = getComponentTargetDir({ componentsDir, name, type })
}) => {
  createComponentDir({ name: `${type}/${name}`, dir: targetDir })
  processTemplates({
    platform,
    type,
    name,
    destination: targetDir,
    componentsDir,
    extension,
    scss,
    storybookScope,
    templatePath
  })

  return targetDir
}

const generateComponents = async ({
  ai = false,
  aiConfig = false,
  appConfig,
  names,
  platform,
  prompt,
  type,
  validate
}) => {
  await renderBanner(appConfig.banner)

  checkPlatform({ platform, templatePath })
  createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath })
  createWorkflow({ workflowTemplatePath })

  const projectConfig = readDotFile(projectDotFilePath)
  checkPackageJson(projectPackagePath)
  checkPlatformDependency({
    packagePath: projectPackagePath,
    packageName: projectConfig.search
  })
  checkAndCreateDir(projectConfig.destination)
  createAtomicDirs({
    dir: projectConfig.destination,
    extension: projectConfig.extension,
    scss: projectConfig.scss
  })

  const targetDirs = names.map((name) =>
    scaffoldComponent({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      name,
      platform,
      scss: projectConfig.scss,
      type
    })
  )

  if (ai) {
    await runOpenAiCompatibleGeneration({
      aiConfig,
      createExtraScaffold: (item) => {
        const targetDir = getComponentTargetDir({
          componentsDir: projectConfig.destination,
          name: item.name,
          type: item.type
        })

        if (fs.existsSync(targetDir)) return targetDir

        return scaffoldComponent({
          componentsDir: projectConfig.destination,
          extension: projectConfig.extension,
          name: item.name,
          platform,
          scss: projectConfig.scss,
          targetDir,
          type: item.type
        })
      },
      options: { names, prompt, type },
      targetDirs,
      validate
    })
  }

  showCopyright(appConfig)
}

const generateImportedItem = ({ item, platform, projectConfig }) => {
  if (item.moduleName) {
    generateModuleItem({
      domainName: item.forDomain,
      item,
      moduleName: item.moduleName,
      platform,
      projectConfig,
      subdomainName: item.forSubdomain
    })
    return
  }

  if (item.forModule) {
    generateModuleItem({
      item,
      moduleName: item.forModule,
      platform,
      projectConfig
    })
    return
  }

  if (item.for && item.type !== 'subdomain') {
    if (item.type === 'module') {
      createModuleFiles({
        componentsDir: projectConfig.destination,
        domainName: item.forDomain,
        extension: projectConfig.extension,
        name: item.name,
        scss: projectConfig.scss,
        subdomainName: item.forSubdomain
      })
      return
    }

    generateScopedItem({
      domainName: item.forDomain,
      item,
      platform,
      projectConfig,
      subdomainName: item.forSubdomain
    })
    return
  }

  if (['atom', 'molecule', 'organism', 'page', 'template'].includes(item.type)) {
    const targetDir = `${projectConfig.destination}/${item.type}s/${item.name}`

    createComponentDir({ name: `${item.type}/${item.name}`, dir: targetDir })
    processTemplates({
      platform,
      type: item.type,
      name: item.name,
      destination: targetDir,
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
      templatePath
    })
    return
  }

  if (['domain', 'hook', 'lib', 'service'].includes(item.type)) {
    createSidecarFiles({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      name: item.name,
      type: item.type
    })
    return
  }

  if (item.type === 'module') {
    createModuleFiles({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      name: item.name,
      scss: projectConfig.scss
    })
    return
  }

  createSubdomainFiles({
    allowExisting: true,
    componentsDir: projectConfig.destination,
    domainName: item.for,
    extension: projectConfig.extension,
    name: item.name
  })
}

const generateModuleItem = ({ domainName, item, moduleName, platform, projectConfig, subdomainName }) => {
  createModuleFiles({
    allowExisting: true,
    componentsDir: projectConfig.destination,
    domainName,
    extension: projectConfig.extension,
    name: moduleName,
    scss: projectConfig.scss,
    subdomainName
  })

  if (moduleComponentTypes.includes(item.type)) {
    const moduleComponentsDir = getModuleComponentsDir({
      componentsDir: projectConfig.destination,
      domainName,
      moduleName,
      subdomainName
    })

    scaffoldComponent({
      componentsDir: moduleComponentsDir,
      extension: projectConfig.extension,
      name: item.name,
      platform,
      scss: projectConfig.scss,
      storybookScope: [
        ...(domainName ? ['domains', domainName, ...(subdomainName ? [subdomainName] : [])] : []),
        'modules',
        moduleName,
        'Components'
      ],
      type: item.type
    })
    return
  }

  createScopedModuleFiles({
    componentsDir: projectConfig.destination,
    domainName,
    extension: projectConfig.extension,
    moduleName,
    name: item.name,
    scss: projectConfig.scss,
    subdomainName,
    type: item.type
  })
}

const generateScopedItem = ({ domainName, item, platform, projectConfig, subdomainName }) => {
  if (isAtomicType(item.type)) {
    const scopedComponentsDir = getScopedComponentsDir({
      componentsDir: projectConfig.destination,
      domainName,
      subdomainName
    })
    const targetDir = `${scopedComponentsDir}/${item.type}s/${item.name}`

    createSubdomainFiles({
      allowExisting: true,
      componentsDir: projectConfig.destination,
      domainName,
      extension: projectConfig.extension,
      name: subdomainName,
      scss: projectConfig.scss
    })
    createAtomicDirs({
      dir: scopedComponentsDir,
      extension: projectConfig.extension,
      scss: projectConfig.scss
    })
    createComponentDir({
      name: `${domainName}/${subdomainName}/${item.type}/${item.name}`,
      dir: targetDir
    })
    processTemplates({
      platform,
      type: item.type,
      name: item.name,
      destination: targetDir,
      componentsDir: scopedComponentsDir,
      extension: projectConfig.extension,
      scss: projectConfig.scss,
      storybookScope: ['domains', domainName, ...(subdomainName ? [subdomainName] : []), 'Components'],
      templatePath
    })
    return
  }

  createScopedSubdomainFiles({
    componentsDir: projectConfig.destination,
    domainName,
    extension: projectConfig.extension,
    name: item.name,
    scss: projectConfig.scss,
    subdomainName,
    type: item.type
  })
}

const prepareProject = ({ platform, withAtomicDirs = false }) => {
  checkPlatform({ platform, templatePath })
  createDotFile({ dotFilePath: projectDotFilePath, platform, templatePath })

  const projectConfig = readDotFile(projectDotFilePath)
  checkPackageJson(projectPackagePath)
  checkPlatformDependency({
    packagePath: projectPackagePath,
    packageName: projectConfig.search
  })

  if (withAtomicDirs) {
    checkAndCreateDir(projectConfig.destination)
    createAtomicDirs({
      dir: projectConfig.destination,
      extension: projectConfig.extension,
      scss: projectConfig.scss
    })
  }

  return projectConfig
}

const completeAiDocumentation = async ({
  aiConfig,
  forDomain,
  forSubdomain,
  moduleName,
  names,
  prompt,
  targetDirs,
  type,
  validate
}) =>
  runOpenAiCompatibleGeneration({
    aiConfig,
    expandScaffold: false,
    options: {
      forDomain,
      forSubdomain,
      moduleName,
      names,
      prompt,
      type
    },
    targetDirs,
    validate
  })

const generateSidecar = async ({ ai, aiConfig, appConfig, names, platform, prompt, type, validate }) => {
  await renderBanner(appConfig.banner)
  const projectConfig = prepareProject({ platform })

  names.forEach((name) => {
    createSidecarFiles({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      name,
      type
    })
  })

  if (ai) {
    await completeAiDocumentation({
      aiConfig,
      names,
      prompt,
      targetDirs: names.map((name) =>
        path.join(
          getSidecarDir({
            componentsDir: projectConfig.destination,
            type
          }),
          name
        )
      ),
      type,
      validate
    })
  }

  showCopyright(appConfig)
}

const generateSubdomain = async ({ ai, aiConfig, appConfig, forDomain, names, platform, prompt, validate }) => {
  await renderBanner(appConfig.banner)
  const projectConfig = prepareProject({ platform })

  names.forEach((name) => {
    createSubdomainFiles({
      componentsDir: projectConfig.destination,
      domainName: forDomain,
      extension: projectConfig.extension,
      name,
      scss: projectConfig.scss
    })
  })

  if (ai) {
    await completeAiDocumentation({
      aiConfig,
      forDomain,
      names,
      prompt,
      targetDirs: names.map((name) =>
        getSubdomainDir({
          componentsDir: projectConfig.destination,
          domainName: forDomain,
          subdomainName: name
        })
      ),
      type: 'subdomain',
      validate
    })
  }

  showCopyright(appConfig)
}

const generateScoped = async ({
  ai,
  aiConfig,
  appConfig,
  forDomain,
  forSubdomain,
  names,
  platform,
  prompt,
  type,
  validate
}) => {
  await renderBanner(appConfig.banner)
  const projectConfig = prepareProject({ platform })

  names.forEach((name) => {
    generateScopedItem({
      domainName: forDomain,
      item: { name, type },
      platform,
      projectConfig,
      subdomainName: forSubdomain
    })
  })

  if (ai) {
    const folder = scopedTypeDirectories[type]
    await completeAiDocumentation({
      aiConfig,
      forDomain,
      forSubdomain,
      names,
      prompt,
      targetDirs: names.map((name) =>
        path.join(
          getSubdomainDir({
            componentsDir: projectConfig.destination,
            domainName: forDomain,
            subdomainName: forSubdomain
          }),
          folder,
          name
        )
      ),
      type,
      validate
    })
  }

  showCopyright(appConfig)
}

const generateModule = async ({
  ai,
  aiConfig,
  appConfig,
  forDomain,
  forSubdomain,
  names,
  platform,
  prompt,
  validate
}) => {
  await renderBanner(appConfig.banner)
  const projectConfig = prepareProject({ platform })

  names.forEach((name) => {
    createModuleFiles({
      componentsDir: projectConfig.destination,
      domainName: forDomain,
      extension: projectConfig.extension,
      name,
      scss: projectConfig.scss,
      subdomainName: forSubdomain
    })
  })

  if (ai) {
    await completeAiDocumentation({
      aiConfig,
      forDomain,
      forSubdomain,
      names,
      prompt,
      targetDirs: names.map((name) =>
        getScopedModuleDir({
          componentsDir: projectConfig.destination,
          domainName: forDomain,
          moduleName: name,
          subdomainName: forSubdomain
        })
      ),
      type: 'module',
      validate
    })
  }

  showCopyright(appConfig)
}

const generateForModule = async ({
  ai,
  aiConfig,
  appConfig,
  forDomain,
  forSubdomain,
  moduleName,
  names,
  platform,
  prompt,
  type,
  validate
}) => {
  await renderBanner(appConfig.banner)
  const projectConfig = prepareProject({ platform })

  names.forEach((name) => {
    generateModuleItem({
      item: { name, type },
      domainName: forDomain,
      moduleName,
      platform,
      projectConfig,
      subdomainName: forSubdomain
    })
  })

  if (ai) {
    const folder = moduleTypeDirectories[type]
    const moduleDir = getScopedModuleDir({
      componentsDir: projectConfig.destination,
      domainName: forDomain,
      moduleName,
      subdomainName: forSubdomain
    })
    await completeAiDocumentation({
      aiConfig,
      forDomain,
      forSubdomain,
      moduleName,
      names,
      prompt,
      targetDirs: names.map((name) => path.join(moduleDir, folder, name)),
      type,
      validate
    })
  }

  showCopyright(appConfig)
}

const configurePlatform = async ({ appConfig, existingConfig, platform }) => {
  await renderBanner(appConfig.banner)

  checkPlatform({ platform, templatePath })
  const requestedAiConfig = await promptAiConfig({
    defaultSkillPath: getInstalledSkillIndex({
      appVersion: appConfig.version
    }),
    existingAiConfig: existingConfig?.ai || false
  })
  const aiConfig = installSkillBundleForAi({
    aiConfig: requestedAiConfig,
    appVersion: appConfig.version,
    skillSourcePath
  })

  writeDotFile({
    aiConfig,
    dotFilePath: projectDotFilePath,
    platform,
    templatePath
  })
  showCopyright(appConfig)
}

const updateSkills = async ({ appConfig, existingConfig, platform }) => {
  await renderBanner(appConfig.banner)

  checkPlatform({ platform, templatePath })
  const aiConfig = installSkillBundleForAi({
    aiConfig: existingConfig?.ai,
    appVersion: appConfig.version,
    skillSourcePath
  })

  if (aiConfig) {
    writeDotFile({
      aiConfig,
      dotFilePath: projectDotFilePath,
      platform,
      templatePath
    })
  }

  showCopyright(appConfig)
}

const exportStructure = ({ appConfig, filePath, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message)

    console.log(chalk.green(`${data}`))

    const projectConfig = prepareProject({ platform })
    writeGenerationStructure({
      componentsDir: projectConfig.destination,
      extension: projectConfig.extension,
      filePath,
      platform: projectConfig.platform
    })

    showCopyright(appConfig)
  })
}

const generateFromStructure = ({ appConfig, filePath, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message)

    console.log(chalk.green(`${data}`))

    const structure = readGenerationStructure(filePath)
    const projectConfig = prepareProject({ platform, withAtomicDirs: true })

    structure.items.forEach((item) => {
      generateImportedItem({ item, platform, projectConfig })
    })

    showCopyright(appConfig)
  })
}

const removeItem = ({ appConfig, name, platform }) => {
  figlet(appConfig.banner, (err, data) => {
    if (err) error(err.message)

    console.log(chalk.green(`${data}`))

    const projectConfig = prepareProject({ platform })

    removeGeneratedItem({
      componentsDir: projectConfig.destination,
      name
    })

    showCopyright(appConfig)
  })
}

export const promptCleanConfirmation = async ({
  input = process.stdin,
  output = process.stdout,
  isInteractive = input.isTTY && output.isTTY,
  question = false
} = {}) => {
  if (!isInteractive) return false

  const rl = question ? false : readline.createInterface({ input, output })
  const prompt = question || ((message) => rl.question(message))

  try {
    const answer = await prompt('Remove these unused paths? [y/N]: ')

    return ['y', 'yes'].includes(answer.trim().toLowerCase())
  } finally {
    if (rl) rl.close()
  }
}

const cleanProject = async ({ appConfig, platform }) => {
  await renderBanner(appConfig.banner)

  const projectConfig = prepareProject({ platform })
  const plan = scanUnusedGeneratedArtifacts({
    componentsDir: projectConfig.destination
  })
  const targets = [...plan.directories, ...plan.files]

  if (targets.length === 0) {
    console.log(chalk.green('No unused generated paths found.'))
    showCopyright(appConfig)
    return
  }

  console.log(chalk.yellow('Unused generated paths:'))
  targets.forEach((target) => {
    console.log(`  ${path.relative(process.cwd(), target)}`)
  })

  const confirmed = await promptCleanConfirmation()

  if (!confirmed) {
    console.log(chalk.yellow('Clean cancelled. No files were removed.'))
    showCopyright(appConfig)
    return
  }

  cleanUnusedGeneratedArtifacts({
    componentsDir: projectConfig.destination,
    ...plan
  })
  showCopyright(appConfig)
}

export const runCli = async (args = process.argv) => {
  const appConfig = readAppConfig(appPackagePath)

  pullTemplateRepository({
    templatePath,
    templateRepository: appConfig.templateRepository
  })

  const platforms = pullPlatforms(templatePath)
  const existingConfig = readDotFile(projectDotFilePath)
  const options = parseArgs({
    args,
    appName: appConfig.name,
    platforms,
    dotConfig: existingConfig
  })

  if (options.platformOnly) {
    await configurePlatform({
      appConfig,
      existingConfig,
      platform: options.platform
    })
    return
  }

  if (options.updateSkills) {
    await updateSkills({
      appConfig,
      existingConfig,
      platform: options.platform
    })
    return
  }

  if (options.exportFile) {
    exportStructure({
      appConfig,
      filePath: options.exportFile,
      platform: options.platform
    })
    return
  }

  if (options.fromFile) {
    generateFromStructure({
      appConfig,
      filePath: options.fromFile,
      platform: options.platform
    })
    return
  }

  if (options.removeName) {
    removeItem({
      appConfig,
      name: options.removeName,
      platform: options.platform
    })
    return
  }

  if (options.clean) {
    await cleanProject({
      appConfig,
      platform: options.platform
    })
    return
  }

  if (options.ai) {
    const unavailableMessage = getAiUnavailableMessage({
      aiConfig: existingConfig?.ai || false,
      options
    })

    if (unavailableMessage) error(unavailableMessage)
  }

  if (options.type === 'module') {
    await generateModule({
      aiConfig: existingConfig.ai,
      appConfig,
      ...options
    })
    return
  }

  if (options.moduleName) {
    await generateForModule({
      aiConfig: existingConfig.ai,
      appConfig,
      ...options
    })
    return
  }

  if (options.forSubdomain) {
    await generateScoped({
      aiConfig: existingConfig.ai,
      appConfig,
      ...options
    })
    return
  }

  if (['domain', 'hook', 'lib', 'service'].includes(options.type)) {
    await generateSidecar({
      aiConfig: existingConfig.ai,
      appConfig,
      ...options
    })
    return
  }

  if (options.type === 'subdomain') {
    await generateSubdomain({
      aiConfig: existingConfig.ai,
      appConfig,
      ...options
    })
    return
  }

  await generateComponents({
    aiConfig: existingConfig.ai,
    appConfig,
    ...options
  })
}
