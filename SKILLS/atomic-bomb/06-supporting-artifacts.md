# Atomic Bomb Supporting Artifacts

## Purpose

Use this file for `atomic-bomb --ai` generated file amendments, mocks, tests and Storybook rules.

---

## Generated File Amendment Rules

Generated Atomic Bomb files are starting points and may be amended only with architectural intent.

Allowed amendments:

* completing placeholder interfaces
* implementing the generated component
* adding reusable SCSS variants
* updating mocks, tests and Storybook stories to reflect supported variants
* improving accessibility, naming and type safety

Disallowed amendments:

* adding one-off screen-specific styling
* patching an atom only for a single page, template, organism or molecule
* introducing context-aware business behavior into a presentational atom

---

## Mock Files

Mock files store reusable default props.

Purpose:

* Storybook stories
* unit tests
* visual tests
* component variations

Standard mock pattern:

```ts
import { fn } from 'storybook/test'
import type { FormInterface } from './Form.interface'

export const FormMock: FormInterface = {
  label: 'Ticket title',
  name: 'title',
  value: 'Printer offline',
  placeholder: 'Enter a title',
  disabled: false,
  saveText: 'Save',
  cancelText: 'Cancel',
  onChange: fn<(value: string) => void>(),
  onSave: fn(),
  onCancel: fn(),
}
```

---

## Storybook Rules

A Storybook story already exists after Atomic Bomb generation.

Always amend the generated Storybook file when the component exposes reusable variants or supported states.

Do not amend Storybook to document one-off page-specific styling hacks.

When using Storybook with React Context:

* consult the official Storybook documentation
* ensure Context providers are wrapped correctly
* use decorators when necessary

Standard Storybook pattern:

```tsx
import { type Meta, type StoryObj } from '@storybook/react-vite'
import ButtonGroupSrc from './ButtonGroup'
import { ButtonGroupMock } from './ButtonGroup.mock'
import { ICON_TYPES } from '@/components/_types_'

const ButtonGroupMeta: Meta<typeof ButtonGroupSrc> = {
  title: 'molecules/ButtonGroup',
  component: ButtonGroupSrc,
  argTypes: {
    testID: {
      table: {
        disable: true
      }
    },
    onPrimaryAction: { table: { disable: true } },
    onSecondaryAction: { table: { disable: true } },
    primaryIcon: {
      control: 'select',
      options: ICON_TYPES,
    },
    secondaryIcon: {
      control: 'select',
      options: ICON_TYPES,
    },
  }
}

type Story = StoryObj<typeof ButtonGroupSrc>

export const ButtonGroup: Story = {
  args: { ...ButtonGroupMock }
}

export default ButtonGroupMeta
```

---

## Required Enforcement Artifacts

For template-quality Atomic Bomb projects, the supporting artifacts should not stop at component files.

Also require:

* a single validation command such as `npm run check` or `yarn check`
* Storybook and CLI test paths that can be run independently
* structural checks or lint rules for recurring drift such as stale naming, missing `_types_`, broken barrels, or SCSS boilerplate violations
* a scaffold smoke test for starter projects that verifies a fresh project can install this instruction bundle and still pass validation

If a consistency rule keeps being violated in downstream projects, upgrade it from guidance into one of these enforceable artifacts.

---

## Delivery Checklist

Before considering Atomic Bomb work complete, confirm:

* the generated artifact set is structurally complete for its role
* mocks, stories, and tests reflect the supported states and actions
* reusable style variants live in the component SCSS instead of consumers
* shared types, barrels, and imports are aligned after the change
* the project validation command succeeds
