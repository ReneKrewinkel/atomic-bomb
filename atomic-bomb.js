#!/usr/bin/env node

import figlet from 'figlet'
import chalk from 'chalk'
//import fs from 'fs'
import fs from 'fs-extra'
import * as url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import shell from 'shelljs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url)).slice(0, -1)

const appPackage = `${__dirname}/package.json`
const templatePath = `${__dirname}/templates`

const convertToPascalCase = (s) => {
    const r = s.replace(/\w+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    return(r.split(' ').join(''))
}

const readConfig = () => {
    const cfg = JSON.parse(fs.readFileSync(appPackage, 'utf8'))
    return([
        cfg.name,
        convertToPascalCase(cfg.name.replace('-', ' ')),
        cfg.version,
        cfg.author,
        cfg.config.templates
    ])
}

const [appName, appBanner,
    appVersion, appAuthor,
    templateRep] = readConfig()

const check = (msg) => {
    console.log(`✅ ${msg}`)
}

const error = (msg) => {
    console.log(chalk.red(`💀 ${msg}`))
    process.exit(1)
}

const showCopyright = () => {
    console.log(`\n\n💥 ${ appName } v${ appVersion } © ${ appAuthor } \n`)
}

/// Project functions
const packagePath = "./package.json"
//const srcPath = "./src"
//const componentsPath = `${srcPath}/components`
const validOptions = ["atom", "molecule", "organism", "template", "page"]
const platforms = ["react", "react-native", "vue", "angular", "svelte"]

let componentsPath = ""

const checkPackageJson = () => {
    if(!fs.existsSync(packagePath)) error("package.json doesn't exist")
    check("package.json is available")
}

const checkPlatformType = (platform) => {
    const result = fs.readFileSync(packagePath, 'utf8')
    if(!JSON.parse(result).dependencies[platform]) error(`${platform} not installed`)
    check(`react ${ JSON.parse(result).dependencies.react.replace('^', '') } is installed`)
}

const checkAndCreateDir = (dir) => {
    const d = dir.replace("//", "/")
    fs.ensureDirSync(dir,0o744)
    check(`${d} directory present`)
}

const createAtomicDirs = () =>  {
    validOptions.forEach( item => {
        const theDir = `${componentsPath}/${item}s`
        fs.ensureFileSync(`${theDir}/_index.scss`,'')
    })
}

const createComponentDir = (name, dir) =>  {
    if(fs.existsSync(dir)) error(`${name} Component exists`)
    checkAndCreateDir(dir)
}


const processTemplates = (platform, type, name, dest) => {

    const icons = { atom: '⚛️', molecule: '🔅',
                    organism: '🐙', template: '⊟',
                    page: '𝍌' }

    try {
        const base = `${componentsPath}/${type}s`
        const files = fs.readdirSync(`${templatePath}/${platform}`)
        files.forEach(file => {
            const fName = file.replace('[NAME]', name)
            check(`${icons[type]} ${type}s/${fName}`);
            const content = fs.readFileSync(`${templatePath}/${platform}/${file}`, 'utf8')
            const result = content.replace(/\[NAME\]/g, name)
            const result2 = result.replace(/\[TYPE\]/g, `${type}s`)
            fs.writeFileSync(`${dest}/${fName}`, result2)
        })
        fs.appendFileSync(`${base}/_index.scss`, `\n@import './${name}';`)
    } catch(err)  {
        error(`oops, ${err.message}`)
    }

}

const checkPlatform = (platform) => {
    if(!fs.existsSync(`${templatePath}/${platform}`)) {
        error(`Platform "${platform}" does not exist (yet). You might want to open a PR?`)
    }
    const result = fs.readFileSync(`${templatePath}/${platform}.json`, 'utf-8')
    componentsPath = JSON.parse(result).destination
}

const pullRepository = () => {
   fs.rmSync(templatePath, { recursive:true, force: true})
   if(shell.exec(`git clone --quiet ${templateRep} ${templatePath}`).code !== 0) error("Code templates not available")
}

const run = (platform, type, names) => {


    figlet(appBanner, (err, data) => {
        console.log(chalk.green(`${data}`))
        checkPlatform(platform)
        checkPackageJson()
        checkPlatformType(platform)
        //checkAndCreateDir(srcPath)
        checkAndCreateDir(componentsPath)
        createAtomicDirs()

        names.forEach(name => {
            const targetDir = `${componentsPath}/${type}s/${name}`
            createComponentDir(`${type}/${name}`, targetDir)
            processTemplates(platform, type, name, targetDir)
        })

        showCopyright()
    })
}


const processArgs = (args) => {

    const usage =`USAGE: ${appName} \n\t--platform ${platforms.join("|") } \n\t--type ${ validOptions.join("|") } \n\t--name [NAME](,[NAME],[NAME])`

    const argv = yargs(hideBin(args)).argv
    try {

        if (!argv.type || !argv.name || !argv.platform ) error(usage)
        if (validOptions.indexOf(argv.type.toLowerCase()) === -1) error(usage)

        const names = argv.name.split(",")
        const realNames = names.map(item => convertToPascalCase(item))
        const platform = argv.platform.toLowerCase()

        return([platform, argv.type.toLowerCase(), realNames ])
    } catch(err) {
        error(usage)
    }
}

pullRepository()

const [platform, type, name] = processArgs(process.argv)
run(platform, type, name)



