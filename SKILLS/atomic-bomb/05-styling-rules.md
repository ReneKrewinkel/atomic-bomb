# Atomic Bomb Styling Rules

## Purpose

Use this file for `atomic-bomb --ai` SCSS, variants and styling boundaries.

---

## Styling Rules

* Do not style components inline
* Use SCSS partials
* SCSS partials live beside the component
* Use `data-object-type` for variants
* Use BEM-style naming
* Use generated design tokens from `src/resources/design/tokens.json`
* Run `npm run token` or `yarn token` to regenerate token SCSS before relying on new token values
* Never use Tailwind
* Never use CSS frameworks
* Never use CSS modules
* Never use styled-components
* Never use emotion
* Do not add screen-specific or one-off styling in consuming components when the variation belongs to the atom
* When styling requirements differ slightly from an existing atom, extend that atom through reusable SCSS variants instead of patching feature-specific styles around it
* Default text styling must follow the typography definitions sourced from `src/resources/design/tokens.json` through the shared style system
* `main-text-regular` is only correct when it maps to the current token definition; do not treat the token name alone as the full rule

---

## Token Rule

When a project contains `src/resources/design/tokens.json`:

* that file is the source of truth for colors, fonts, spacing and related tokenized primitives
* `_tokens.scss` is generated output, not the authoring source
* SCSS should prefer token-backed variables and shared mixins over raw hex values, ad hoc font declarations or duplicated spacing literals
* typography must follow the token definition as a whole: family, source, weight, style, fallback stack, size and line-height when those are tokenized

Do NOT:

* manually edit generated token output and treat it as authoritative
* bypass the token script when adding tokenized colors, fonts or spacing
* introduce new design values in component SCSS when an equivalent token should exist
* copy only the token label (for example `main-text-regular`) while ignoring the rest of the token-defined typography contract

---

## SCSS Structure Rule

Generated component style files are boilerplates and must be followed to the letter.

Rules:

* keep a single root selector for the component, e.g. `.Button`
* place reusable variants, children, states and media-query sections inside that generated root block
* keep the generated media-query placeholders in the same file and inside the component root block
* do not append a second standalone root class block that redefines the component from scratch
* do not switch to ad hoc modifier conventions if the generated component already uses `data-object-type` / `data-object-size`

Bad drift example:

```scss
.Button {
  // generated boilerplate
}

.Button {
  // unrelated second implementation block
}

.Button--primary {
  // ad hoc modifier drift
}
```

Preferred pattern:

```scss
.Button {
  &[data-object-type='primary'] {
    background: var(--bg-primary);
  }

  &[data-object-size='medium'] {
    min-height: 2.5rem;
  }

  .Label {
    // inherit or consume the shared token-defined typography contract
  }

  @media (max-width: 480px) {
  }
}
```

---

## Variant Rule

When a component needs bold, small, muted, primary, secondary or similar reusable presentation differences:

* amend the existing atom through explicit reusable variants
* model the variant through props and SCSS selectors
* keep the atom generic

Do NOT:

* patch an atom only for a single page, template, organism or molecule
* add page-specific styling hacks into the atom
* style around the atom in the consumer when the difference belongs to the atom itself

---

## Example

```scss
.Button {
  &[data-object-type='primary'] {
    background-color: var(--bg-primary);
    color: var(--fg-accent);
  }

  &[data-object-type='secondary'] {
    background-color: var(--bg-primary);
    color: var(--fg-dark);
  }

  &__text {
    // consume the shared token-defined typography contract instead of hardcoding a partial font rule
  }
}
```

```tsx
import type { ButtonInterface } from './Button.interface'

const Button = ({
  testID,
  type = 'primary',
  text
}: ButtonInterface) => {
  return (
    <div
      data-testid={testID}
      data-object-type={type ?? 'primary'}
      className={'Button'}
    >
      <div className={'Button__text'}>
        {text}
      </div>
    </div>
  )
}

export default Button
```
