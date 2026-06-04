# Atomic Bomb Component Design

## Purpose

Use this file for `atomic-bomb --ai` architectural boundaries, atomic levels and reuse-versus-extension decisions.

---

## Architectural Separation

### Components

Presentation logic only.

Components are responsible for:

* rendering
* local UI state
* event forwarding
* composition
* accessibility logic

Components are NOT responsible for:

* API logic
* business rules
* data transformation
* persistence
* domain calculations

### Domains

`/domains` contains:

* business logic
* domain models
* transformations
* workflows
* business rules

### Lib

`/lib` contains:

* generic reusable functions
* utility functions
* formatters
* parsers
* validators
* generic helpers

Public lib and hook types belong in sibling `<Name>.interface.ts` or `<Name>.types.ts` files rather than inline in the implementation file.

### Context

Use React Context only for shared application state.

Do NOT place:

* temporary form state
* hover state
* local modal state
* transient UI state

inside global context.

Prefer local component state whenever possible.

---

## Atomic Design Rules

Always decompose components into the smallest reusable atomic structure.

Never render raw typography or UI tags directly inside higher-level components.

Avoid:

```tsx
<p>{text}</p>
<h1>{title}</h1>
<button>Save</button>
```

Prefer:

```tsx
<Paragraph text={text} />
<Heading text={title} />
<Button text="Save" />
```

---

## Component Levels

### Atoms

Atoms are the smallest indivisible reusable UI elements.

Examples:

* Label
* Icon
* Button
* InputField

Atoms may contain:

* local UI state
* component-only event handling
* accessibility logic

Atoms must NOT contain:

* application logic
* API calls
* business rules

### Molecules

Molecules combine atoms into reusable structures.

Examples:

* ButtonGroup

Molecules may contain:

* loops
* local state
* component composition

Molecules must NOT contain:

* business workflows
* API orchestration
* domain logic

### Organisms

Organisms combine molecules and atoms into functional application sections.

Examples:

* Form

Organisms may contain:

* async orchestration
* domain interaction
* application behavior
* feature-level logic

### Templates

Templates contain:

* navigation
* routing layout
* global structural composition

Templates should remain minimal.

### Pages

Pages combine organisms into application-specific screens.

Pages may contain:

* API interaction
* context interaction
* feature orchestration
* routing logic

Standard page behavior in this installed instruction bundle:

* pages keep feature-local form and screen state local
* pages compose organisms instead of rebuilding their internals
* pages call reusable hooks or libs for async behavior
* pages only set shared context when the feature truly requires it

---

## Reusing and Extending Existing Atoms

When a requested feature needs UI that is close to an existing atom but not identical:

1. Inspect existing atoms first
2. Reuse the existing atom if it can support the new case through a stable and reusable prop-based API
3. Do not apply one-off styling directly inside the consuming molecule, organism, template or page
4. Do not fork an atom for a minor visual difference
5. Add the variation intentionally through:

   * semantic props
   * explicit variants
   * `data-object-type`
   * BEM-style modifiers
   * updated interface, mock, test, Storybook story and SCSS partial

6. If the variation is domain-specific or makes the atom context-aware, create a new atom or compose a molecule instead

Decision rule:

* extend an existing atom when the variation is generic and likely reusable
* create a new atom or molecule when the variation is feature-specific, behavioral or semantically different

---

## Standard Composition Stack

Treat this as the regular Atomic Bomb composition model:

1. `Label`, `Icon`, `Button`, `InputField` define the atom layer
2. `ButtonGroup` composes atoms into a reusable action row
3. `Form` composes `InputField` and `ButtonGroup` and forwards save/cancel behavior
4. A feature page owns screen state and API orchestration
5. `useAPI` and `API` show the non-component support layer
6. `src/components/_types_/...` provides shared UI enums and literal type collections
