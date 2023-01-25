# Atomic Bomb
This commandline tool creates boilerplate atomic design components for React apps.

<img src='./nuke.png' style="width: 100%;" alt="AtomicBomb">

> **IMPORTANT** This tool is for educational purposes only. 

> ## UDATE VERSION 4.1.1
> * Added `scss` flag to `.atomic-bomb` config to control if scss files are generated. 
> * Automatically creates a GitHub workflow file for converting **TODO**'s to issues 

> ## UPDATE VERSION 4.n
> * Gets valid platforms from template repository
> * Writes configuration to `.atomic-bomb` file in the project-root
> * Reads configuration from `.atomic-bomb` where you can manually set `search`, `platform` and `destination`-directory.
> 


## Install
```shell
npm install --global atomic-bomb
# Or in your project
npm install --save-dev atomic-bomb
yarn add -D atomic-bomb
```

## Usage: 
```shell
atomic-bomb --platform react --type atom|molecule|organism|template|page --name [NAME](,[NAME],[NAME])  
```   

`--platform` can be extended.
Please head over to [Templates](https://github.com/ReneKrewinkel/atomic-bomb-templates) and open a pull request if you want to 
contribute to more templates. 

## Example 
```shell
atomic-bomb --platform react --type atom --name Label
atomic-bomb --platform react --type molecule --name Header
```

## Add multiple
```shell
atomic-bomb --platform react --type atom --name Label,Button,Input
```

## dot-file
`atomic-bomb` creates a dot-file (`.atomic-bomb`) in the root 
of your project. You can configure the defaults in this file 
so you can omit the platform definition. You can also modify 
the base location of your `atoms`, `molecules` etc. directories.
Default content: 
```json
{
  "search": "react",
  "platform": "react",
  "destination": "src/components",
  "scss": true
}
```
* `search`: package to search for in `package.json` to determine if `atomic-bomb` can be used
* `platform`: shorthand for the `--platform` flag
* `destination`: directory where the atomic-dirs are put.
* `scss`: if an `_index.scss` in each atomic-dir should be created.

## Shorthand
```
atomic-bomb --name Label
```
Defaults to `--platform react` and `--type atom`

## Output (React)
```shell
[PROJECT_ROOT]/src/components
├── atoms
│   ├── _atoms.scss
│   ├── Label
│   │   ├── Label.js
│   │   ├── Label.stories.js
│   │   ├── Label.test.js
│   │   ├── _Label.style.scss
│   │   ├── _index.scss
│   │   └── index.js
│   └── _index.scss
└── molecules
    ├── _molecules.scss
    ├── Header    
    │   ├── Header.js
    │   ├── Header.stories.js
    │   ├── Header.test.js
    │   ├── _Header.style.scss
    │   ├── _index.scss
    │   └── index.js
    └── _index.scss
```