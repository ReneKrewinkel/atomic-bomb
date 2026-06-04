# Atomic Bomb Core Rules

## Purpose

Use this file for Atomic Bomb `--ai` generation rules, folder structure, naming and execution order.

---

## Core Principles

* Use [Atomic Bomb](https://github.com/ReneKrewinkel/atomic-bomb?utm_source=chatgpt.com) for all front-end components
* Use Atomic Bomb scaffolding to create:
  * components
  * hooks
  * domains
  * contexts
  * templates
  * pages
  * utility libraries
* Treat Atomic Bomb scaffolding as mandatory for supported front-end artifacts, not optional guidance
* Always inspect the existing project structure before generating code
* Always reuse existing components before generating new ones
* Prefer composition over duplication
* Obey `.prettierrc.json`
* Use TypeScript strict typing
* Allow `// @ts-ignore` when necessary for real integration constraints, generated code gaps, or third-party typing issues
* Keep types and interfaces for hooks, libs and similar modules in separate same-folder files named `<Name>.interface.ts` or `<Name>.types.ts`
* Use `const` instead of `function`
* Use functional React components and hooks only
* Use PascalCase for component names
* Use the `@` alias instead of relative imports where applicable
* Never use anonymous default exports
* Never use class-based React components
* Prefer target-project checks over prose-only conventions when the rule can be validated mechanically

---

## Required Workflow Order

When generating a feature:

1. Inspect existing atoms, molecules and organisms
2. Reuse existing components where possible
3. Use Atomic Bomb to scaffold the required artifacts before manual implementation
4. Analyze whether an existing atom can be extended through reusable variants
5. Extend existing atoms before generating new ones when the change is generic and presentational
6. Analyze whether new atoms are required
7. Generate missing atoms first with Atomic Bomb
8. Generate molecules from atoms with Atomic Bomb
9. Generate organisms from molecules with Atomic Bomb
10. Generate templates if navigation/layout is needed with Atomic Bomb
11. Generate pages last with Atomic Bomb
12. Generate interfaces
13. Generate mock files
14. Generate Storybook stories
15. Generate SCSS partials
16. Validate architecture consistency
17. Run the project-level validation command

---

## Required Folder Structure

```txt
src/
  components/
    _types_/
      Button/
      Icon/
      Label/
      index.ts
  atoms/
    _index.scss
    index.tsx
    ComponentName/
      _index.scss
      _ComponentName.style.scss
      index.tsx
      ComponentName.interface.tsx
      ComponentName.mock.ts
      ComponentName.test.tsx
      ComponentName.stories.tsx
      ComponentName.tsx
    molecules/
    organisms/
    templates/
    pages/
  hooks/
    useAPI/
      index.ts
      useAPI.types.ts
      useAPI.ts
  lib/
    API/
      API.types.ts
      API.ts
      index.ts
```

Use the same structure inside domains where domain-local components are required.

Standard Atomic Bomb artifact set:

* atoms: `Button`, `Icon`, `InputField`, `Label`
* molecule: `ButtonGroup`
* organism: `Form`
* page: an application-specific feature page
* hook: `useAPI`
* lib: `API`
* shared UI contracts: `Button`, `Icon`, `Label` and similar contracts under `src/components/_types_`

Treat this as the regular output shape when the pack is installed into a fresh scaffold.

---

## Type and Interface File Rules

For hooks, utility libraries, services and similar non-component modules:

* keep exported types and interfaces in separate files beside the implementation
* use `<Name>.interface.ts` for interface-focused definitions
* use `<Name>.types.ts` for type-focused definitions
* avoid keeping public reusable types inline in the implementation file

---

## Structural Consistency Rules

Reject generated Atomic Bomb output when any of these drift patterns appear:

* missing colocated files that are required by the component type or contract
* barrels that do not re-export the generated implementation consistently
* `_types_` contracts that duplicate or contradict the live component API
* SCSS files that replace the generated component root shape instead of extending it
* manual structures created in place of Atomic Bomb scaffolding without an explicit fallback decision

When these drift patterns recur across projects, update this installed instruction bundle, standard rules, or project checks rather than accepting the inconsistency as normal.
