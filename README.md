# Atomic Bomb

<img src='./nuke.png' style="height: 180px;">

Creates boilerplate atomic design components for React apps.

> This tool is for educational purposes only. 

## Install
```shell
npm install --global atomic-bomb
```

## Usage: 
```shell
atomic-bomb --type atom|molecule|organism --name [Name]  
```   


## Example 
```shell
atomic-bomb --type atom --name Label
atomic-bomb --type molecule --name Header
```

## Output
```shell
[PROJECT_ROOT]/src/components
├── atoms
│   ├── Label
│   │   ├── Label.js
│   │   ├── Label.stories.js
│   │   ├── Label.test.js
│   │   ├── _Label.style.scss
│   │   ├── _index.scss
│   │   └── index.js
│   └── _index.scss
└── molecules
    ├── Header
    │   ├── Header.js
    │   ├── Header.stories.js
    │   ├── Header.test.js
    │   ├── _Header.style.scss
    │   ├── _index.scss
    │   └── index.js
    └── _index.scss
```