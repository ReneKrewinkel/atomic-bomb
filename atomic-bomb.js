#!/usr/bin/env node

//import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk from 'chalk'
import fs from 'fs'
import * as url from 'url'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

//const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));


const valid = ["atom", "molecule", "organism"]
const usage ='atomic-bomb --type atom|molecule|organism --name [Name]'
const packagePath = "./package.json"
const srcPath = "./src"
const componentsPath = `${srcPath}/components`
const templatePath = `${__dirname}/templates`

const error = (msg, terminate = true) => {
    console.log(chalk.red(`💀 ${msg}`))
    terminate ? process.exit(1) : false
}

const check = (msg) => {
    console.log(`✅ ${msg}`)
}

const processTemplates = (type, name, dest) => {
    const base = `${componentsPath}/${type}`
    fs.readdir(templatePath, (err, files) => {
        files.forEach(file => {
            const fName = file.replace('[NAME]', name)
            check(`Processing: ${fName}`);
            const content = fs.readFileSync(`${templatePath}/${file}`, 'utf8')
            const result = content.replace(/\[NAME\]/g, name)
            const result2 = result.replace(/\[TYPE\]/g, type)
            fs.writeFileSync(`${dest}/${fName}`, result2)
        })
        fs.appendFileSync(`${base}/_index.scss`, `\n@import './${name}';`)
    })

    return true
}

const checkDir = async (dir) => {
    if (!fs.existsSync(dir)) error(`${dir} directory not present`)
    check(`${dir} directory present`)
    return true
}

const checkNotDir = async (dir) => {
    if(fs.existsSync(dir)) error(`${dir} directory exists`)
    fs.mkdirSync(dir, 0o744);
    check(`${dir} directory not present & created`)
    return true
}


const checkReact = async() => {
    let result = fs.readFileSync(packagePath, 'utf8')
    if(!JSON.parse(result).dependencies.react) error("react not installed")
    check(`react ${ JSON.parse(result).dependencies.react.replace('^', '') } is installed`)
    return true
}

const checkPackageJson = async() => {
    if(!fs.existsSync(packagePath)) error("package.json doesn't exist")
    check("package.json is available")
    return true
}

const startUp = async (type, name) => {
    console.clear()
    const targetDir = `${componentsPath}/${type}/${name}`
    figlet(`AtomicBomb`, async (err, data) => {
        console.log(chalk.green(`${data} \n`))
        const packageExists = await checkPackageJson()
        const isReact = await checkReact()
        const hasSrcDir = await checkDir(srcPath)
        const hasComponentsDir = await checkDir(componentsPath)
        const hasComponent = await checkNotDir(targetDir)
        const filesProcessed = await processTemplates(type, name, targetDir)

        console.log("\n\n💥 atomic-bomb v2.0 © Rene Krewinkel \n\n")
    })
    return true
}

const convertToPascalCase = (s) => {
    const r = (s.replace(/\w+/g, (w) =>  w[0].toUpperCase() + w.slice(1).toLowerCase()))
    return(r.split(' ').join(''))
}

const processArgs = (args) => {
    const argv = yargs(hideBin(args)).argv
    try {
        if (!argv.type || !argv.name) error(usage)
        if (valid.indexOf(argv.type.toLowerCase()) === -1) error(usage)

        return([argv.type.toLowerCase() + "s", convertToPascalCase(argv.name) ])
    } catch(err) {
        error(usage)
    }
}

const [t, n] = processArgs(process.argv)
await startUp(t, n)

