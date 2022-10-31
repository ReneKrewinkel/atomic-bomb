# Atomic Bomb
This commandline tool creates boilerplate atomic design components for React apps.

<img src='./nuke.png' style="width: 100%;" alt="AtomicBomb">

> **IMPORTANT** This tool is for educational purposes only. 

## Install
```shell
npm install --global atomic-bomb
# Or in your project
npm install --save-dev atomic-bomb
yarn add -D atomic-bomb
```

## Usage: 
```shell
atomic-bomb --type atom|molecule|organism|page --name [Name](,[NAME],[NAME])  
```   


## Example 
```shell
atomic-bomb --type atom --name Label
atomic-bomb --type molecule --name Header
```

## Add multiple
```shell
atomic-bomb --type atom --name Label,Button,Input
```

## Output
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