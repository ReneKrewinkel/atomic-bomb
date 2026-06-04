# Atomic Bomb Canonical Reference Contract

## Purpose

Use this file whenever `atomic-bomb --ai` creates, updates, reviews or repairs Atomic Bomb output.

This file defines the regular implementation rules for optimized Atomic Bomb output. Treat it as the canonical contract for how Atomic Bomb artifacts are scaffolded, completed, wired, exported, styled, tested and documented.

The AI provider must implement application code in the target project's real `src/` tree. Never write target application code inside the installed skill folder.

---

## Mandatory Interpretation Rule

When prose, generated templates and local examples disagree, use this precedence:

1. Current target project source and package scripts
2. Bootstrap contract in `02-project-bootstrap.md`
3. This canonical reference contract
4. Existing split rules in `03-core-rules.md` through `06-supporting-artifacts.md`

If a target project already has a stronger, explicit local convention, follow it. If there is no stronger local convention, this file is mandatory.

---

## Mandatory Generation Order

For any non-trivial UI feature, generate and implement from the bottom up:

1. Shared `_types_` contracts
2. Atoms
3. Molecules
4. Organisms
5. Templates, only if layout/navigation is required
6. Pages
7. Hooks
8. Libs
9. App-level wiring
10. Tests, stories and mocks aligned with each public contract
11. Barrels and Sass barrels
12. Project validation

Use Atomic Bomb scaffolding first for every artifact it can create. Manual folder creation is only acceptable when scaffolding is unavailable and the user explicitly accepts the fallback.

---

## Canonical Feature Shape

The regular Atomic Bomb composition model uses this optimized chain:

```txt
App
└── pages/FeaturePage
    ├── atoms/Label
    └── organisms/Form
        ├── atoms/InputField
        └── molecules/ButtonGroup
            └── atoms/Button
                ├── atoms/Icon
                └── atoms/Label
```

Rules:

* App shells import pages from `@/components/pages`.
* Pages own screen state, page-level orchestration and feature-specific side effects.
* Organisms compose atoms and molecules into functional sections.
* Molecules compose atoms into reusable structures.
* Atoms remain generic, presentational and reusable.
* Libs contain generic reusable infrastructure such as `API`.
* Hooks contain reusable React state/orchestration such as `useAPI`.
* Shared UI variants live in `src/components/_types_`.

Do not collapse these layers for convenience. If a feature seems too small, still preserve the appropriate boundary for its role.

---

## Required Component Folder Shape

Each Atomic Bomb component must use this colocated shape unless the target project has an explicit stronger convention:

```txt
ComponentName/
  ComponentName.tsx
  ComponentName.interface.tsx
  ComponentName.mock.ts
  ComponentName.stories.tsx
  ComponentName.test.tsx
  _ComponentName.style.scss
  _index.scss
  index.tsx
```

Required file responsibilities:

* `ComponentName.tsx`: implementation only
* `ComponentName.interface.tsx`: public component props and local helper types
* `ComponentName.mock.ts`: reusable default props and variants for stories/tests
* `ComponentName.stories.tsx`: Storybook metadata, controls and variants
* `ComponentName.test.tsx`: render and contract smoke tests
* `_ComponentName.style.scss`: component-root SCSS only
* `_index.scss`: local Sass barrel, usually `@use 'ComponentName.style';`
* `index.tsx`: local TS barrel, usually `export { default } from './ComponentName'`

Do not leave generated placeholder files stale after implementing a component.

---

## Barrel Contract

Every generated item must be reachable through the correct barrel.

Component folder barrel:

```tsx
export { default } from './Button'
```

Atomic type barrel:

```tsx
export { default as Button } from './Button'
export { default as Icon } from './Icon'
```

Root component barrel:

```ts
export * from './atoms'
export * from './molecules'
export * from './organisms'
export * from './pages'
export * from './templates'
```

Sass local barrel:

```scss
@use 'Button.style';
```

Sass atomic type barrel:

```scss
@use './Button';
@use './Icon';
```

Rules:

* After adding, moving or removing a component, update both TypeScript and Sass barrels.
* Barrels must not export missing components.
* Barrels must not omit live generated components.
* Do not import deep implementation files from consumers when a barrel exists.

---

## Shared `_types_` Contract

Use `src/components/_types_` for reusable UI contracts that are shared by multiple components or stories.

Canonical examples:

```txt
src/components/_types_/Button/enum.ts
src/components/_types_/Icon/IconTypes.ts
src/components/_types_/Icon/enum.ts
src/components/_types_/Label/enum.ts
src/components/_types_/index.ts
```

Required patterns:

```ts
export enum ButtonTypes {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  GHOST = 'ghost',
}
```

```ts
export const ICON_TYPES = [
  'add',
  'check',
  'close',
] as const

export type IconTypes = (typeof ICON_TYPES)[number]
```

Rules:

* Use enums for closed component variant groups such as button size/type and label type.
* Use `as const` arrays when Storybook needs selectable literal options.
* Export `_types_` through local and root barrels.
* Components import shared UI contracts from `@/components/_types_`.
* Do not duplicate shared enums inside component folders.
* Do not place business-domain models in `components/_types_`; domain models belong in domain or feature modules.

---

## Component Implementation Contract

### Required implementation style

Components must:

* be functional React components
* use `const ComponentName = (...) => { ... }`
* default-export the named component
* type props from the sibling interface file
* accept optional `testID?: string` when rendered output should be test-addressable
* write `data-testid={testID}` on the root element when `testID` exists
* use `className={'ComponentName'}` or equivalent stable root class
* use `data-object-type`, `data-object-size` and similar data attributes for variants
* keep render helpers local and prefixed consistently when useful, e.g. `__renderIcon`
* avoid anonymous default exports

Canonical root pattern:

```tsx
import type { ButtonInterface } from './Button.interface'
import { ButtonSizes, ButtonTypes } from '@/components/_types_'

const Button = ({
  testID,
  type,
  size,
}: ButtonInterface) => {
  return (
    <div
      data-testid={testID}
      data-object-type={type ?? ButtonTypes.PRIMARY}
      data-object-size={size ?? ButtonSizes.MEDIUM}
      className={'Button'}
    />
  )
}

export default Button
```

### Event handling

Event handlers must:

* be typed through the interface file
* be forwarded from atoms/molecules to higher-level owners
* not contain business rules in atoms
* use local handler names such as `__handleSave`, `__handleChange`, `__handleCancel`

Atoms forward events. Pages and feature-level organisms may orchestrate.

### Required composition behavior

Do not render raw UI primitives in higher layers if an atom exists.

Bad:

```tsx
<button>Save</button>
<input />
<h1>IT Service Desk</h1>
```

Good:

```tsx
<Button text="Save" action={__handleSave} />
<InputField label="Ticket title" onChange={__handleChange} />
<Label text="IT Service Desk" />
```

---

## Atomic Level Rules

### Atoms

Atoms are reusable UI primitives.

Canonical atoms:

* `Button`
* `Icon`
* `InputField`
* `Label`

Atoms may:

* render labels, icons and native controls
* forward event callbacks
* expose reusable variants
* contain accessibility details

Atoms must not:

* call APIs
* own feature workflow state
* import pages, organisms or feature modules
* know about business entities

### Molecules

Molecules compose atoms into reusable UI structures.

Canonical molecule:

* `ButtonGroup`

Molecules may:

* compose atoms
* set default presentation props
* forward high-level callbacks

Molecules must not:

* call APIs
* own page-specific business workflows
* duplicate atom styling through wrapper hacks

### Organisms

Organisms compose atoms and molecules into functional sections.

Canonical organism:

* `Form`

Organisms may:

* coordinate multiple child components
* translate child event payloads
* expose section-level save/cancel/change APIs

Organisms should avoid:

* global app state unless explicitly required
* direct persistence if a page should own the workflow

### Pages

Pages own screen orchestration.

Canonical page:

* an application-specific feature page

Pages may:

* hold screen state
* call libs or hooks
* handle async save/load flows
* pass state and handlers into organisms

Pages must:

* compose existing organisms and atoms
* keep app shell wiring thin
* avoid duplicating lower-level component markup

---

## Interface Contract

Every component must have a sibling interface file.

Rules:

* Name it `ComponentName.interface.tsx` for React components.
* Export `ComponentNameInterface`.
* Keep props explicit and narrow.
* Include `testID?: string` when tests or stories need stable root selection.
* Use shared `_types_` enums for variants.
* Use callback props for events.
* Do not inline reusable public props in `ComponentName.tsx`.

Example:

```ts
export interface InputFieldInterface {
  label: string
  name?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: string) => void
  testID?: string
}
```

For mutually constrained props, model the constraint in the interface file.

Canonical Button rule:

* A `Button` must have at least one of `text` or `icon`.
* This belongs in the interface file, not as an undocumented runtime assumption.

---

## Mock Contract

Every component must have a sibling mock file when it has props.

Rules:

* Name it `ComponentName.mock.ts`.
* Export at least `ComponentNameMock`.
* Type mocks with `ComponentNameInterface`.
* Use `storybook/test` `fn()` for callback mocks in stories.
* Provide extra named mocks for meaningful reusable variants.

Examples:

```ts
export const ButtonMock: ButtonInterface = {
  text: 'Click Me!',
  action: () => alert('Button clicked!'),
  disabled: false,
}
```

```ts
export const ButtonGroupMock: ButtonGroupInterface = {
  primaryText: 'Save',
  secondaryText: 'Cancel',
  primaryIcon: 'check',
  secondaryIcon: 'reset',
  onPrimaryAction: fn(),
  onSecondaryAction: fn(),
}
```

Do not put one-off story-only props directly into stories when they are reusable test fixtures.

---

## Storybook Contract

Every component must have a sibling Storybook file.

Rules:

* Name it `ComponentName.stories.tsx`.
* Import `Meta` and `StoryObj` from `@storybook/react-vite`.
* Use `title: '<atomic-level>/<ComponentName>'`.
* Use the component implementation as `component`.
* Disable `testID` controls.
* Disable callback controls.
* Use `select` controls for enum and literal union variants.
* Use mocks for `args`.
* Add one story per meaningful reusable state or variant.

Canonical pattern:

```tsx
const ButtonMeta: Meta<typeof ButtonSrc> = {
  title: 'atoms/Button',
  component: ButtonSrc,
  argTypes: {
    testID: { table: { disable: true } },
    disabled: { control: 'boolean' },
    type: {
      control: 'select',
      options: Object.values(ButtonTypes),
    },
  },
}
```

When a component exposes icons, sizes, types, disabled states, validation states or loading states, Storybook must make those states inspectable.

---

## Test Contract

Every component must have a sibling test file.

Rules:

* Name it `ComponentName.test.tsx`.
* Use `vitest`.
* Use `renderToStaticMarkup` for baseline render contract tests unless the project has a stronger test renderer convention.
* Import the component and its mock.
* Generate a `testID` and assert it appears in rendered markup.
* Assert required visible text or essential child output appears.
* Add tests for important variants and accessibility states when implemented.

Canonical baseline:

```tsx
const testID = 'InputField-' + Math.floor(Math.random() * 90000) + 10000

describe('InputField', () => {
  it('Can render InputField', () => {
    const rendered = renderToStaticMarkup(
      <InputField testID={testID} {...InputFieldMock} />,
    )

    expect(rendered).toContain(`data-testid="${testID}"`)
    expect(rendered).toContain(InputFieldMock.label)
  })
})
```

Do not leave TODO-only tests as the final output.

---

## Styling Contract

Every component style file must:

* live beside the component
* be named `_ComponentName.style.scss`
* keep a single root selector named `.ComponentName`
* keep the generated media query placeholders inside the root selector
* use `data-object-*` selectors for variants
* use token-backed CSS variables from the resource system when available
* avoid inline styles and CSS-in-JS
* avoid screen-specific styling in lower-level atoms

Canonical structure:

```scss
.Button {
  // base

  &[data-object-size='medium'] {
    // size variant
  }

  &[data-object-type='primary'] {
    // type variant
  }

  .Icon {
    // child alignment
  }

  &[data-disabled='true'] {
    // state
  }

  @media (max-width: 480px) {
  }
}
```

Use current resource tokens when present:

```scss
gap: var(--spacing-small);
border: var(--form-input-border);
border-bottom: var(--form-input-border-bottom);
border-radius: var(--border-radius-medium);
box-shadow: var(--box-shadow-light);
opacity: var(--opacity-disabled);
z-index: var(--z-index-modal);
color: var(--semantic-color-danger);
```

Do not copy outdated literals such as raw hex colors or `var(--shadow)` when the target project has newer generated tokens. These rules define shape and responsibility; target tokens provide actual values.

---

## Hook Contract

Hooks must use the `useName/` sibling-file shape:

```txt
src/hooks/useAPI/
  useAPI.ts
  useAPI.types.ts
  index.ts
src/hooks/index.ts
```

Rules:

* Implementation lives in `useName.ts`.
* Public hook return types live in `useName.types.ts`.
* Local barrel exports default and public types.
* Root hook barrel exports named hook and types.
* Hook names use camelCase and start with `use`.
* Hooks may coordinate React state and reusable async flow.
* Hooks must not contain component markup.

Canonical API hook behavior:

* `data`
* `error`
* `isLoading`
* `request`
* reset error before request
* set loading in `try/finally`
* normalize unknown errors to `Error`

---

## Lib Contract

Libs must use the `Name/` sibling-file shape:

```txt
src/lib/API/
  API.ts
  API.types.ts
  index.ts
src/lib/index.ts
```

Rules:

* Implementation lives in `Name.ts`.
* Public reusable types live in `Name.types.ts`.
* Local barrel exports default, named helpers and types.
* Root lib barrel exports named lib and types.
* Lib names may intentionally preserve uppercase acronyms such as `API`.
* Libs must be generic and reusable.
* UI components should import lib APIs from `@/lib`, not deep files.

Canonical API lib behavior:

* accepts `RequestInfo | URL`
* accepts typed request options
* supports `parseAs: 'json' | 'text'`
* throws on non-OK responses
* returns `undefined` for `204`
* exports mock helpers only when they are explicitly marked mock/demo behavior

---

## App Wiring Contract

`src/App.tsx` should remain thin.

Canonical pattern:

```tsx
import { FeaturePage } from '@/components/pages'

const App = () => {
  return <FeaturePage />
}

export default App
```

Rules:

* App imports page-level components from `@/components/pages`.
* App does not assemble atoms/molecules directly for feature screens.
* App does not contain feature form state when a page should own it.
* App-level providers are acceptable when required by the application architecture.

---

## Accessibility Contract

At minimum:

* Inputs need labels or `aria-label`.
* Buttons/actions need text, icon label, or accessible equivalent.
* Disabled states must be represented in props and DOM attributes/data attributes.
* Validation/error states must be available through props and reflected in DOM state.
* Storybook and tests must cover important accessibility-visible states.

Do not create icon-only actions without a plan for accessible naming.

---

## Drift Rejection Criteria

Reject or repair output when any of these appear:

* component was manually foldered instead of scaffolded when Atomic Bomb was available
* missing interface/mock/story/test/style/index files
* component implementation has props inline instead of sibling interface
* stories do not use mocks
* tests do not assert a stable render contract
* `_types_` variants are duplicated inside components
* component imports deep files instead of barrels
* Sass barrel missing for a live component
* TypeScript barrel missing for a live component
* raw styling values are introduced despite an available token
* atom contains API calls or business workflow logic
* molecule/page renders raw UI controls despite existing atoms
* page state is pushed into global context without necessity
* App becomes a feature implementation instead of a shell

Fix drift before marking work complete.

---

## Mandatory Completion Checklist

Before final response, verify:

* Atomic Bomb scaffolded the artifact when available
* target files are in the real `src/` tree, not in the installed skill folder
* each component has implementation, interface, mock, story, test, style, local barrel and Sass local barrel
* shared variants are exported through `components/_types_`
* TypeScript barrels and Sass barrels include the new artifact
* stories expose supported variants through controls
* tests assert `data-testid` and meaningful rendered content
* components compose through the correct atomic level
* style uses the target resource tokens and keeps one root selector
* hook/lib types live in sibling `.types.ts` files
* `App.tsx` imports pages, not low-level feature fragments
* project validation command passes
