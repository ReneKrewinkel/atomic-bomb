#!/usr/bin/env node

import figlet from 'figlet'
import chalk from 'chalk'
import fs from 'fs'
import * as url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url)).slice(0, -1)

const appPackage = `${__dirname}/package.json`
const templatePath = `${__dirname}/templates`

const convertToPascalCase = (s) => {
    const r = s.replace(/\w+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    return(r.split(' ').join(''))
}

const readConfig = () => {
    const cfg = JSON.parse(fs.readFileSync(appPackage, 'utf8'))
    return([cfg.name,
        convertToPascalCase(cfg.name.replace('-', ' ')),
        cfg.version,
        cfg.author])
}

const [appName, appBanner,
    appVersion, appAuthor] = readConfig()

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
const srcPath = "./src"
const componentsPath = `${srcPath}/components`
const validOptions = ["atom", "molecule", "organism", "template", "page"]

const checkPackageJson = () => {
    if(!fs.existsSync(packagePath)) error("package.json doesn't exist")
    check("package.json is available")
}

const checkReact = () => {
    const result = fs.readFileSync(packagePath, 'utf8')
    if(!JSON.parse(result).dependencies.react) error("react not installed")
    check(`react ${ JSON.parse(result).dependencies.react.replace('^', '') } is installed`)
}

const checkAndCreateDir = (dir) => {
    const d = dir.replace("//", "/")
    if (!fs.existsSync(d)) fs.mkdirSync(d, 0o744);
    check(`${d} directory present`)
}

const createAtomicDirs = () =>  {
    validOptions.forEach( item => {
        const theDir = `${componentsPath}/${item}s`
        checkAndCreateDir(theDir)
    })
}

const createComponentDir = (name, dir) =>  {
    if(fs.existsSync(dir)) error(`${name} Component exists`)
    checkAndCreateDir(dir)
}


const processTemplates = (type, name, dest) => {

    const icons = { atom: '⚛️', molecule: '🔅',
        organism: '🐙', page: '𝍌' }

    try {
        const base = `${componentsPath}/${type}s`
        const files = fs.readdirSync(templatePath)
        files.forEach(file => {
            const fName = file.replace('[NAME]', name)
            check(`${icons[type]} ${type}s/${fName}`);
            const content = fs.readFileSync(`${templatePath}/${file}`, 'utf8')
            const result = content.replace(/\[NAME\]/g, name)
            const result2 = result.replace(/\[TYPE\]/g, `${type}s`)
            fs.writeFileSync(`${dest}/${fName}`, result2)
        })
        fs.appendFileSync(`${base}/_index.scss`, `\n@import './${name}';`)
    } catch(err)  {
        error(`oops, ${err.message}`)
    }

}

const startUp = (type, names) => {


    figlet(appBanner, (err, data) => {
        console.log(chalk.green(`${data}`))
        checkPackageJson()
        checkReact()
        checkAndCreateDir(srcPath)
        checkAndCreateDir(componentsPath)
        createAtomicDirs()

        names.forEach(name => {
            const targetDir = `${componentsPath}/${type}s/${name}`
            createComponentDir(`${type}/${name}`, targetDir)
            processTemplates(type, name, targetDir)
        })

        showCopyright()
    })
}


const processArgs = (args) => {

    const usage =`${appName} --type ${ validOptions.join("|") } --name [NAME](,[NAME],[NAME])`

    const argv = yargs(hideBin(args)).argv
    try {

        if (!argv.type || !argv.name) error(usage)
        if (validOptions.indexOf(argv.type.toLowerCase()) === -1) error(usage)

        const names = argv.name.split(",")
        const realNames = names.map(item => convertToPascalCase(item))

        return([argv.type.toLowerCase(), realNames ])
    } catch(err) {
        error(usage)
    }
}


const [type, name] = processArgs(process.argv)
startUp(type, name)
