# Atomic Bomb Project Bootstrap

## Purpose

Use this file before `atomic-bomb --ai` generates or amends components in a target project.

The installed instruction bundle is only reliable when the target project already matches these assumptions or when the AI plan includes the missing bootstrap work.

---

## Bootstrap Contract

Before generating components, ensure the target project has all of the following:

1. Atomic Bomb tooling installed and runnable through `npx atomic-bomb`
2. Atomic Bomb scaffolding available for the requested artifact type
3. Storybook installed and configured
4. Vite `@` alias configured to map to `src`
5. TypeScript alias configured to map `@/*` to `src/*`
6. Storybook preview loading the real root CSS
7. Storybook static dir serving `public`
8. MSW available for Storybook data mocking
9. Component folders under `src/components`
10. SCSS support installed
11. strict TypeScript enabled
12. `src/resources/design/tokens.json` exists when the project uses design tokens
13. package scripts exist for token generation and SCSS compilation
14. root `main.scss` loads the shared style layers before component bundles

If any item is missing, include the missing bootstrap work in the AI plan first and only then generate components.

Atomic Bomb structure generation is not considered ready unless the CLI can scaffold the required front-end artifacts.

---

## Required Package-Level Capabilities

Install or verify these kinds of dependencies:

* React + Vite
* TypeScript
* Sass
* Storybook for React Vite
* `@storybook/addon-vitest`
* `msw`
* `msw-storybook-addon`
* `mockdate`
* `json-to-scss`

---

## Required Token + SCSS Pipeline

If the target project uses the Atomic Bomb style baseline, the styling pipeline must exist and be used exactly:

1. design tokens live in `src/resources/design/tokens.json`
2. token output is generated through the package script, not by manually editing `_tokens.scss`
3. component styling must consume generated variables, token-backed mixins, and shared font directives from the root style system

Required package scripts:

```json
{
  "scripts": {
    "token": "json-to-scss ./src/resources/design/tokens.json ./src/resources/styles/tokens/_tokens.scss",
    "scss": "sass --quiet ./src/resources/styles/main.scss ./src/resources/styles/main.css"
  }
}
```

Execution rule:

* after changing `src/resources/design/tokens.json`, run `npm run token` or `yarn token`
* after changing shared SCSS, run `npm run scss` or `yarn scss`
* do not hand-edit generated token output as the source of truth

---

## Required Alias Configuration

### `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### `vite.config.ts`

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

---

## Required Root Style Structure

The root style entry must load the shared style layers before Atomic Bomb component bundles:

```scss
@use 'functions';
@use 'tokens';
@use 'reset';
@use 'fonts';
@use 'root';
@use 'page';
@use 'utility';
@use 'headings';

@use '../../components/atoms';
@use '../../components/molecules';
@use '../../components/organisms';
@use '../../components/templates';
@use '../../components/pages';
```

Typography directive:

* body and default application text must follow the typography definition sourced from `src/resources/design/tokens.json` and exposed by the shared style system
* `main-text-regular` is a token entry point, not a license to hardcode typography by name alone
* component styles should inherit that token-defined baseline unless a documented reusable variant intentionally uses another token-defined font contract
* when font family, weights, style, source files, fallback stack, size or line-height come from tokens, implementations must follow the generated/shared typography layer rather than re-declaring partial font values ad hoc

---

## Required Storybook Baseline

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  framework: '@storybook/react-vite',
}

export default config
```

### `.storybook/preview.tsx`

```tsx
import type { Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'

import '../src/index.css'
import { mswHandlers } from './msw-handlers'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    msw: {
      handlers: mswHandlers,
    },
  },
}

export default preview
```

### `.storybook/msw-handlers.ts`

```ts
import type { RequestHandler } from 'msw'

export const mswHandlers: RequestHandler[] = []
```

---

## Required Folder Shape

```txt
src/
  components/
    atoms/
    molecules/
    organisms/
    templates/
    pages/
  hooks/
  lib/
  resources/
```

---

## Required Component Generation Outcome

Each generated atom should end up with colocated files like:

```txt
ComponentName/
  _index.scss
  _ComponentName.style.scss
  index.tsx
  ComponentName.interface.tsx
  ComponentName.mock.ts
  ComponentName.stories.tsx
  ComponentName.test.tsx
  ComponentName.tsx
```

For hooks, libs, services and similar non-component modules, follow this standard sibling-file shape:

```txt
useThing/
  index.ts
  useThing.types.ts
  useThing.ts

ThingAPI/
  ThingAPI.types.ts
  ThingAPI.ts
  index.ts
```

---

## Bootstrap Acceptance Check

A target project is ready for this installed instruction bundle only when all of these are true:

* Atomic Bomb generation works without template errors
* Atomic Bomb can scaffold the required artifacts
* Storybook stories run
* Vite resolves `@/...` imports
* TypeScript resolves `@/...` imports
* a single validation command such as `npm run check` or `yarn check` exists and can validate the generated output
* `npm run token` or `yarn token` successfully regenerates SCSS tokens when tokens are present
* SCSS compiles
* the standard Atomic Bomb component, hook and lib shapes can be reproduced in the target application's real `src/` tree

For template or starter projects, also require a scaffold smoke test that proves a fresh project can install this skill bundle, generate representative artifacts, and pass the validation command.
