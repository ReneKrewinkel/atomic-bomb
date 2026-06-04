# Atomic Bomb AI Skill Entry

## Purpose

Use this file after `index.md` when `atomic-bomb --ai` reads the installed local skill bundle from `.skills/atomic-bomb/<atomic-bomb-version>/`.

This file tells the AI provider:

1. what assumptions must be true before generating code
2. which skill files to apply
3. which standard Atomic Bomb conventions define the target output style
4. how to turn a user request into Atomic Bomb scaffolding and file amendments

---

## Required Runtime Order

For every `atomic-bomb --ai` request:

1. Read `index.md`
2. Read `02-project-bootstrap.md`
3. Verify the project satisfies the bootstrap contract before generating any component
4. Read `03-core-rules.md`
5. Read `04-component-design.md`
6. Read `05-styling-rules.md`
7. Read `06-supporting-artifacts.md`
8. Read `07-canonical-reference-contract.md`
9. Inspect the target project structure, existing artifacts, barrels, tokens and package scripts
10. Produce a concrete scaffold-and-amend plan
11. Verify the project has a single validation entrypoint before considering the generation complete

---

## Hard Rule

Do not generate or amend components until the target project satisfies the bootstrap requirements in `02-project-bootstrap.md`.

All Atomic Bomb front-end generation must use Atomic Bomb scaffolding first.

This applies to:

* atoms
* molecules
* organisms
* templates
* pages
* hooks
* utility libraries
* similar Atomic Bomb artifacts

Do not manually create these structures when Atomic Bomb can scaffold them.
Scaffold first with Atomic Bomb, then implement feature logic inside the generated shape.

If the bootstrap contract is not satisfied:

* stop generation
* install or configure the missing pieces
* then continue

Generated output is not complete until the target project can validate the result through its project-level check command.

---

## AI Planning Contract

Before implementation, the AI provider must decide and record:

* whether the request extends an existing artifact or needs a new one
* the atomic level for each requested UI element
* which Atomic Bomb scaffold commands or internal scaffold operations are required
* which files need post-scaffold edits
* which shared `_types_` should be created or amended
* which design tokens, CSS variables and Sass mixins should be used
* which TypeScript and Sass barrels must change
* which stories, mocks and tests must be completed
* which validation command must run

If the request is ambiguous, choose the smallest reusable Atomic Bomb structure that satisfies the requested behavior.

---

## Source of Truth

When there is ambiguity between prose rules and generated output, prefer:

1. bootstrap contract
2. split skills (`03` through `06`)
3. mandatory canonical reference contract in `07-canonical-reference-contract.md`

---

## Standard Working Model

Use this as the regular Atomic Bomb working model for naming, props, composition, stories, mocks, tests, hooks, libs and `_types_`:

* atoms such as `Button`, `Icon`, `InputField` and `Label`
* molecules such as `ButtonGroup`
* organisms such as `Form`
* pages that own screen state and feature orchestration
* hooks such as `useAPI`
* libs such as `API`
* shared UI contracts under `src/components/_types_`

This standard model defines the expected manner of building components in this installed instruction bundle:

* colocated files
* SCSS partial beside the component
* prop-driven variants
* colocated mock + test + story files
* composition from atom to page
* page-level orchestration
* hooks and libs with sibling exported type files
* `_types_` folders as shared UI contracts
* no inline styles
* no business logic in atoms

The mandatory operational interpretation of this model lives in `07-canonical-reference-contract.md`. Apply that file as the regular way of working for Atomic Bomb output.

---

## Completion Contract

Atomic Bomb work should be treated as complete only when all of these are true:

* Atomic Bomb scaffolded the target shape first
* the generated artifact set matches the required colocated structure
* stories, mocks, and tests exist where the component contract requires them
* barrels and `_types_` exports remain aligned with the implementation
* the project-level validation command succeeds
* starter/template projects retain a smoke-testable path for fresh-project setup
