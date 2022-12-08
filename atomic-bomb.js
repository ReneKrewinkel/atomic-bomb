#!/usr/bin/env node

import figlet from 'figlet'
import chalk from 'chalk'
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

const [ appName, appBanner,
        appVersion, appAuthor,
        templateRep ] = readConfig()

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
const dotFile = "./.atomic-bomb"

const validOptions = ["atom", "molecule", "organism", "template", "page"]
//const platforms = ["react", "react-native", "react-electron", "vue", "angular", "svelte"]

let componentsPath = ""
let search = ""


const createDotFile = (platform) => {
    if(!fs.existsSync(dotFile)) {
        const config = fs.readFileSync(`${templatePath}/${platform}.json`, 'utf-8')
        fs.writeFileSync(".atomic-bomb", config)
    }
}

const readDotFile = () => {
    if(fs.existsSync(dotFile)) {

        try {
            const result = fs.readFileSync(dotFile, 'utf-8')
            const config = JSON.parse(result)
            const { search, platform, destination } = config

            return([platform, search, destination])
        } catch( err ) {
            error(`.atomic-bomb: oops, ${err.message}`)
        }
    }
    return false
}

const isHidden = ({ name }) => {
    const fileHidden = /^\./.test(name);
    return(fileHidden)
}
const pullPlatforms = () => {
    const pTypes = fs.readdirSync(templatePath, { withFileTypes: true})
        .filter( dir => dir.isDirectory() && !isHidden(dir) )
        .map( dir => dir.name )
    return(pTypes)
}

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

const createAtomicDirs = (dir) =>  {
    validOptions.forEach( item => {
        const theDir = `${dir}/${item}s`
        fs.ensureFileSync(`${theDir}/_index.scss`,'')
    })
}

const createComponentDir = (name, dir) =>  {
    if(fs.existsSync(dir)) error(`${name} Component exists`)
    checkAndCreateDir(dir)
}


const processTemplates = (platform, type, name, dest, dir) => {

    const icons = { atom: '⚛️', molecule: '🔅',
                    organism: '🐙', template: '⊟',
                    page: '𝍌' }

    try {
        const base = `${dir}/${type}s`
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
    const settings = JSON.parse(result)
    componentsPath = settings.destination
    search = settings.search
}

const pullRepository = () => {
   fs.rmSync(templatePath, { recursive:true, force: true})
   if(shell.exec(`git clone --quiet ${templateRep} ${templatePath}`).code !== 0) error("Code templates not available")
}

const run = (platform, type, names) => {

    figlet(appBanner, (err, data) => {
        console.log(chalk.green(`${data}`))
        checkPlatform(platform)
        createDotFile(platform)
        const [ p, s, d ] = readDotFile()
        checkPackageJson()
        checkPlatformType(s)
        checkAndCreateDir(d)
        createAtomicDirs(d)

        names.forEach(name => {
            const targetDir = `${d}/${type}s/${name}`
            createComponentDir(`${type}/${name}`, targetDir)
            processTemplates(platform, type, name, targetDir, d)
        })

        showCopyright()
    })
}


const processArgs = (args) => {

    const usage =`USAGE: ${appName} \n\t--platform ${platforms.join("|") } \n\t--type ${ validOptions.join("|") } \n\t--name [NAME](,[NAME],[NAME])`

    const argv = yargs(hideBin(args)).argv
    try {

        let platform

        if(!argv.name) error(usage)

        if(!readDotFile()) {
            platform = argv.platform ? argv.platform.toLowerCase() : "react"
        } else {
            [ platform ] = readDotFile()
        }

        if(platforms.indexOf(platform) === -1) error(usage)

        const type = argv.type ? argv.type.toLowerCase() : "atom"
        if (validOptions.indexOf(type) === -1) error(usage)

        const names = argv.name.split(",")
        const realNames = names.map(item => convertToPascalCase(item))

        return([platform, type, realNames])

    } catch(err) {
        error(usage)
    }
}

pullRepository()
const platforms = pullPlatforms()
const [platform, type, name] = processArgs(process.argv)
run(platform, type, name)



