#!/usr/bin/env node

import figlet from 'figlet'
import chalk from 'chalk'
import fs from 'fs'
import * as url from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

/// Tools
const convertToPascalCase = (s) => {
    const r = (s.replace(/\w+/g, (w) =>  w[0].toUpperCase() + w.slice(1).toLowerCase()))
    return(r.split(' ').join(''))
}

/// App specific
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const appPackage = `${__dirname}/package.json`

const appName = JSON.parse(fs.readFileSync(appPackage, 'utf8')).name
const banner = convertToPascalCase(appName.replace('-', ' '))
const valid = ["atom", "molecule", "organism", "page"]
const usage =`${appName} --type ${ valid.join("|") } --name [NAME]`
const templatePath = `${__dirname}/templates`

/// Project specific
const packagePath = "./package.json"
const srcPath = "./src"
const componentsPath = `${srcPath}/components`

/// Error, if error exit!
const error = (msg, terminate = true) => {
    console.log(chalk.red(`💀 ${msg}`))
    terminate ? process.exit(1) : false
}

/// Display check mark with message
const check = (msg) => {
    console.log(`✅ ${msg}`)
}

/// Print the copyright notice
const printCopyright = () => new Promise( resolve => {
    let result = fs.readFileSync(appPackage, 'utf8')
    let pkg = JSON.parse(result)
    console.log(`💥 ${ appName } v${ pkg.version } © ${ pkg.author } \n`)
    resolve(true)
})

/// Process the templates
const processTemplates = (type, name, dest) => new Promise( (resolve, reject) => {
    try {
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
        resolve(true)
    } catch(err)  {
        error("Oops...")
        reject(false)
    }

})
/// Check if mandatory dir exists
const checkDir = (dir) => new Promise( resolve => {
    if (!fs.existsSync(dir)) error(`${dir} directory not present`)
    check(`${dir} directory present`)
    resolve(true)
})

/// Check if the Component directory DOESN'T exist and create it
const checkNotDir = async (dir) => new Promise( resolve => {
    if(fs.existsSync(dir)) error(`${dir} directory exists`)
    fs.mkdirSync(dir, 0o744);
    check(`${dir} directory not present & created`)
    resolve(true)
})

/// Check if the atomic dirs exist, if not, create them
const createAtomicDirs = () => new Promise( resolve => {
    valid.forEach( item => {
        const theDir = `${componentsPath}/${item}s`
        if(!fs.existsSync(theDir)) {
            fs.mkdirSync(theDir)
            check(`atomic dir ${theDir} created`)
        }
    })
    check(`atomic dirs present`)
    resolve(true)
})

/// Check if react is present in the project package.json
const checkReact = async() => new Promise( resolve => {
    let result = fs.readFileSync(packagePath, 'utf8')
    if(!JSON.parse(result).dependencies.react) error("react not installed")
    check(`react ${ JSON.parse(result).dependencies.react.replace('^', '') } is installed`)
    resolve(true)
})

/// Check if the projects package.json exists
const checkPackageJson = () => new Promise( resolve => {
    if(!fs.existsSync(packagePath)) error("package.json doesn't exist")
    check("package.json is available")
    resolve(true)
})

/// Main routine
const startUp = (type, name) => new Promise( resolve => {
    console.clear()
    const targetDir = `${componentsPath}/${type}/${name}`
    figlet(banner, async (err, data) => {
        console.log(chalk.green(`${data} \n`))
        await printCopyright()
        const packageExists = await checkPackageJson()
        const isReact = await checkReact()
        const hasSrcDir = await checkDir(srcPath)
        const hasComponentsDir = await checkDir(componentsPath)
        const hasAtomicDirs = await createAtomicDirs()
        const hasComponent = await checkNotDir(targetDir)
        const isProcessed = await processTemplates(type, name, targetDir)
    })
})

/// Check commandline args
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

/// Let's go!
const [t, n] = processArgs(process.argv)
await startUp(t, n)
