# Atomic Bomb AI Skill Index

## Purpose

This folder is installed by `atomic-bomb -p` into the target project at `.skills/atomic-bomb/<atomic-bomb-version>/` and read by `atomic-bomb --ai`.

When `atomic-bomb --ai` is called, the AI provider must use this index as the entrypoint for deciding:

* which Atomic Bomb artifacts to scaffold
* which existing artifacts should be reused or extended
* which props, types, stories, mocks, tests and SCSS files are required
* which TypeScript and Sass barrels must be updated
* which validation steps must run before completion

The AI provider must not treat these files as optional examples. They are the default Atomic Bomb operating contract.

---

## Read Order

Read and apply the instruction files in this order:

1. `01-start-here.md`
2. `02-project-bootstrap.md`
3. `03-core-rules.md`
4. `04-component-design.md`
5. `05-styling-rules.md`
6. `06-supporting-artifacts.md`
7. `07-canonical-reference-contract.md`

If only one file can be read, read `07-canonical-reference-contract.md`.

Resolve every listed file relative to this local `index.md` file inside `.skills/atomic-bomb/<atomic-bomb-version>/`.

---

## Runtime Inputs Expected From Atomic Bomb

Before producing a generation plan, the AI provider should receive or infer:

* requested artifact name
* requested artifact type, such as atom, molecule, organism, template, page, hook, lib, domain or context
* current platform/template
* target project root structure
* existing components, hooks, libs, domains and barrels
* relevant `tokens.json`, generated CSS variables, Sass mixins and root style entrypoints
* package scripts and validation command
* user prompt or feature description

If these inputs are incomplete, the AI provider must make the smallest safe plan and prefer scaffolding over manual file creation.

---

## Required AI Output Behavior

The AI provider should return a concrete Atomic Bomb generation plan before implementation.

The plan must identify:

* artifacts to scaffold with Atomic Bomb
* existing artifacts to reuse or extend
* shared `_types_` that need to exist or change
* component props and variants
* required files to amend after scaffolding
* TypeScript barrels to update
* Sass barrels to update
* token variables or mixins that should be used
* tests, stories and mocks to complete
* validation command to run

The implementation must then follow that plan unless the target project proves a stronger local convention.

---

## Component Setup Decision Flow

For each user request:

1. Identify whether the request is for UI, a hook, a lib, a domain, context, or mixed feature work.
2. Inspect existing target project artifacts before planning new files.
3. Reuse or extend existing atoms when the need is generic and prop-driven.
4. Create new atoms only for new reusable primitives.
5. Create molecules for repeated combinations of atoms.
6. Create organisms for complete functional sections.
7. Create pages for screen-level orchestration and feature state.
8. Create hooks for reusable React state or async orchestration.
9. Create libs for generic reusable infrastructure.
10. Update barrels, Sass barrels, `_types_`, stories, mocks and tests as part of the same operation.

Atomic Bomb must scaffold supported artifacts before the AI provider fills in implementation details.

---

## Preferred Plan Shape

When the provider supports structured output, return the planning phase in this shape:

```json
{
  "summary": "Short description of the requested component setup.",
  "scaffold": [
    {
      "type": "atom",
      "name": "Button",
      "reason": "Reusable primitive action component."
    }
  ],
  "reuse": [
    {
      "artifact": "Label",
      "reason": "Existing atom covers text rendering."
    }
  ],
  "amend": [
    {
      "path": "src/components/atoms/Button/Button.interface.tsx",
      "reason": "Add reusable props and variants."
    }
  ],
  "barrels": [
    "src/components/atoms/index.tsx",
    "src/components/atoms/_index.scss"
  ],
  "tokens": [
    "var(--semantic-color-primary)",
    "var(--spacing-small)"
  ],
  "validate": "npm run check"
}
```

If structured output is unavailable, return the same information as clear Markdown sections.

---

## Non-Negotiable Rules

* Use Atomic Bomb scaffolding first for artifacts Atomic Bomb can create.
* Do not manually invent a folder shape when the CLI can scaffold it.
* Keep components colocated with implementation, interface, mock, story, test, style and local barrels.
* Keep shared UI variants in `src/components/_types_`.
* Use the target project's generated design tokens and CSS variables.
* Update TypeScript and Sass barrels after adding, moving or removing artifacts.
* Validate the project before reporting completion.
