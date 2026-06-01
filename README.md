# Atomic Bomb

Atomic Bomb is a small CLI for generating React project structure from atomic design and DDD-style conventions.

It can create:

- atomic components: `atom`, `molecule`, `organism`, `template`, `page`
- shared files next to components: `hook`, `lib`
- domain containers and subdomain folders
- scoped domain files: `api`, `event`, `helper`, `hook`, `model`, `page`, `service`, `state`
- structure JSON exports and imports
- recursive generated item removal

<div align="center">
<img src="./promo-atomic-bomb.png" style="width: 420px;" alt="Atomic Bomb">

![Rust](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square)
![Neovim](https://img.shields.io/badge/Neovim-0.9%2B-57A143?logo=neovim&logoColor=white)

</div>

> **Important**
> This tool is for educational purposes.

## Install

```shell
npm install --global atomic-bomb
```

Or install it in a project:

```shell
npm install --save-dev atomic-bomb
yarn add -D atomic-bomb
```

You can also run it with `npx`:

```shell
npx atomic-bomb@latest --type atom --name Logo
```

## Requirements

Run Atomic Bomb from the root of a project with a `package.json`.

The CLI checks the configured `search` package in your project dependencies. For React templates this is usually `react`.

## Quick Start

Configure the platform:

```shell
atomic-bomb --platform react-ts
atomic-bomb -p react-ts
```

Create a component:

```shell
atomic-bomb --type atom --name Logo
```

After the first configuration, `--platform` can be omitted. Atomic Bomb reads it from `.atomic-bomb`.

```shell
atomic-bomb --type molecule --name "Button Group"
```

## Usage

```shell
atomic-bomb --platform [PLATFORM]
atomic-bomb -p [PLATFORM]

atomic-bomb --type atom|molecule|organism|template|page --name [NAME](,[NAME],[NAME])

atomic-bomb --type hook --name [NAME](,[NAME],[NAME])
atomic-bomb --type lib --name [NAME](,[NAME],[NAME])

atomic-bomb --type domain --name [NAME](,[NAME],[NAME])
atomic-bomb --type subdomain --for [DOMAIN] --name [NAME](,[NAME],[NAME])

atomic-bomb --for [DOMAIN]/[SUBDOMAIN] --type atom|molecule|organism|template --name [NAME]
atomic-bomb --for [DOMAIN]/[SUBDOMAIN] --type api|event|helper|hook|model|page|service|state --name [NAME]

atomic-bomb --export structure.json
atomic-bomb --from structure.json
atomic-bomb --remove [NAME]
```

## Platforms

Platforms are pulled from the template repository configured in `package.json`:

```json
{
  "config": {
    "templates": "https://github.com/ReneKrewinkel/atomic-bomb-templates.git"
  }
}
```

Use:

```shell
atomic-bomb --platform react-ts
atomic-bomb -p react-ts
```

This writes or updates `.atomic-bomb` without requiring `--name`.

Available platforms depend on the template repository. See [atomic-bomb-templates](https://github.com/ReneKrewinkel/atomic-bomb-templates).

## Configuration

Atomic Bomb creates a `.atomic-bomb` file in the project root.

Example:

```json
{
  "search": "react",
  "extension": "tsx",
  "platform": "react-ts",
  "destination": "src/components",
  "scss": true
}
```

Fields:

- `search`: dependency name to check in `package.json`
- `extension`: component file extension: `js`, `jsx`, `ts` or `tsx`
- `platform`: default platform used when `--platform` is omitted
- `destination`: component root, usually `src/components`
- `scss`: whether `_index.scss` files are created and updated

## Naming

Atomic Bomb normalizes names by type.

Component and container types use `PascalCase`:

- `atom`
- `molecule`
- `organism`
- `template`
- `page`
- `domain`
- `subdomain`

Non-component file types use `camelCase`:

- `api`
- `event`
- `helper`
- `hook`
- `lib`
- `model`
- `service`
- `state`

Examples:

```shell
atomic-bomb --type atom --name "data table"
# DataTable

atomic-bomb --type hook --name "use data"
# useData

atomic-bomb --for Orders/Sales --type event --name "order created"
# orderCreated
```

Existing `PascalCase` component names and existing `camelCase` non-component names are preserved.

## CLI Output

Generated output uses icons for the newer structure types:

- `hook`: 🪝
- `lib`: 📚
- `domain`: 🏢
- `subdomain`: 🗄️

## Atomic Components

Create one component:

```shell
atomic-bomb --type atom --name Label
atomic-bomb --type molecule --name Header
atomic-bomb --type organism --name Navigation
atomic-bomb --type template --name Dashboard
atomic-bomb --type page --name Home
```

Create multiple components:

```shell
atomic-bomb --type atom --name Label,Button,Input
```

Create a multi-word component:

```shell
atomic-bomb --type molecule --name "Button Group"
```

Atomic components are created in:

```shell
src/components/[type]s/[Name]
```

Example output for a React TypeScript component:

```shell
src/components/molecules/ButtonGroup
├── ButtonGroup.interface.tsx
├── ButtonGroup.mock.ts
├── ButtonGroup.stories.tsx
├── ButtonGroup.test.tsx
├── ButtonGroup.tsx
├── _ButtonGroup.style.scss
├── _index.scss
└── index.tsx
```

Atomic directory indexes are created for each component bucket:

```shell
src/components
├── index.ts
├── atoms
│   ├── index.tsx
│   └── _index.scss
├── molecules
│   ├── index.tsx
│   └── _index.scss
├── organisms
│   ├── index.tsx
│   └── _index.scss
├── templates
│   ├── index.tsx
│   └── _index.scss
└── pages
    ├── index.tsx
    └── _index.scss
```

When `extension` is `tsx` or `jsx`, non-component barrel files use the matching logic extension:

- `tsx` -> `ts`
- `jsx` -> `js`

## Hooks

Create hooks next to `components`:

```shell
atomic-bomb --type hook --name useData
```

Output:

```shell
src/hooks
├── index.ts
└── useData
    ├── index.ts
    └── useData.ts
```

The generated file contains:

```ts
export const useData = () => {}

export default useData
```

## Lib

Create shared lib files next to `components`:

```shell
atomic-bomb --type lib --name formatDate
```

Output:

```shell
src/lib
├── index.ts
└── formatDate
    ├── index.ts
    └── formatDate.ts
```

The generated file contains:

```ts
export const formatDate = () => {}

export default formatDate
```

## Domains

Create a domain directory next to `components`:

```shell
atomic-bomb --type domain --name Orders
```

Output:

```shell
src/domains
├── index.ts
└── Orders
    └── index.ts
```

`src/domains/index.ts` exports the domain:

```ts
export * as Orders from './Orders'
```

## Subdomains

Create a subdomain inside a domain:

```shell
atomic-bomb --type subdomain --for Orders --name Sales
```

If the domain does not exist, it is created.

Output:

```shell
src/domains/Orders
├── index.ts
└── Sales
    ├── api
    │   └── index.ts
    ├── components
    │   ├── index.ts
    │   ├── atoms
    │   │   ├── index.tsx
    │   │   └── _index.scss
    │   ├── molecules
    │   │   ├── index.tsx
    │   │   └── _index.scss
    │   ├── organisms
    │   │   ├── index.tsx
    │   │   └── _index.scss
    │   ├── templates
    │   │   ├── index.tsx
    │   │   └── _index.scss
    │   └── pages
    │       ├── index.tsx
    │       └── _index.scss
    ├── events
    │   └── index.ts
    ├── helpers
    │   └── index.ts
    ├── hooks
    │   └── index.ts
    ├── models
    │   └── index.ts
    ├── pages
    │   └── index.ts
    ├── services
    │   └── index.ts
    ├── state
    │   └── index.ts
    └── index.ts
```

The subdomain `index.ts` exports every DDD folder:

```ts
export * from './components'
export * from './hooks'
export * from './services'
export * from './state'
export * from './models'
export * from './events'
export * from './helpers'
export * from './api'
export * from './pages'
```

## Scoped Generation

Use `--for [DOMAIN]/[SUBDOMAIN]` to create files inside a subdomain.

Atomic component types go into the subdomain `components` folder:

```shell
atomic-bomb --for Orders/Sales --type atom --name Logo
atomic-bomb --for Orders/Sales --type molecule --name FilterBar
atomic-bomb --for Orders/Sales --type organism --name OrdersTable
atomic-bomb --for Orders/Sales --type template --name SalesDashboard
```

Example:

```shell
src/domains/Orders/Sales/components/atoms/Logo
├── Logo.interface.tsx
├── Logo.mock.ts
├── Logo.stories.tsx
├── Logo.test.tsx
├── Logo.tsx
├── _Logo.style.scss
├── _index.scss
└── index.tsx
```

Scoped domain file types go into their matching folders:

```shell
atomic-bomb --for Orders/Sales --type hook --name useOrders
atomic-bomb --for Orders/Sales --type service --name orderService
atomic-bomb --for Orders/Sales --type event --name orderCreated
atomic-bomb --for Orders/Sales --type helper --name formatOrder
atomic-bomb --for Orders/Sales --type api --name fetchOrders
atomic-bomb --for Orders/Sales --type model --name order
atomic-bomb --for Orders/Sales --type state --name orderState
atomic-bomb --for Orders/Sales --type page --name SalesOverview
```

Examples:

```shell
src/domains/Orders/Sales/hooks/useOrders
├── index.ts
└── useOrders.ts

src/domains/Orders/Sales/services/orderService
├── index.ts
└── orderService.ts
```

Each folder index is updated:

```ts
export { default as orderService } from './orderService'
```

Scoped generation repairs missing subdomain index files when the subdomain already exists.

## Remove Generated Items

Remove generated items by name:

```shell
atomic-bomb --remove Logo
atomic-bomb --remove orderService
```

The remove command scans generated `components`, `domains`, `hooks`, and `lib` folders recursively. It removes every matching item directory and cleans matching TypeScript and Sass barrel lines such as:

```ts
export { default as Logo } from './Logo'
export * as Orders from './Orders'
```

```scss
@use './Logo';
```

## Export Structure

Export the current generated structure as JSON:

```shell
atomic-bomb --export structure.json
```

This exports the directory structure, not file contents.

Example:

```json
{
  "version": 1,
  "platform": "react-ts",
  "items": [
    { "type": "atom", "name": "Logo" },
    { "type": "lib", "name": "formatDate" },
    { "type": "domain", "name": "Orders" },
    { "type": "subdomain", "for": "Orders", "name": "Sales" },
    { "type": "service", "for": "Orders/Sales", "name": "orderService" }
  ]
}
```

## Create From Structure

Create all items listed in a structure file:

```shell
atomic-bomb --from structure.json
```

The JSON is validated with Zod before generation. Invalid files stop with an error.

Scoped items must use:

```json
{
  "type": "service",
  "for": "Orders/Sales",
  "name": "orderService"
}
```

Subdomains use a domain-only `for` value:

```json
{
  "type": "subdomain",
  "for": "Orders",
  "name": "Sales"
}
```

## Testing Without npm Scripts

Run the test suite directly:

```shell
node --test _tests_/*.test.js
```

Check syntax directly:

```shell
find src _tests_ -maxdepth 1 -name '*.js' -print | sort | xargs -n1 node --check
```

## Development

Format files:

```shell
npm run nice
```

Run tests:

```shell
npm test
```

## Publishing

Before publishing:

```shell
npm whoami
npm test
npm pack --dry-run
```

Publish:

```shell
npm publish
```

If publishing from GitHub Actions, make sure the publish workflow trigger matches the release flow. A job guarded by:

```yaml
if: github.event.pull_request.merged == true
```

will be skipped on normal `push` or tag events because `github.event.pull_request` is not present for those events.

## License

GPL-1.0-only
