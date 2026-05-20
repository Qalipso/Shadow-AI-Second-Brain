# ADR-009: Immutable state pattern across React tree

**Status:** Accepted
**Date:** 2026-05-15

## Context
React relies on referential equality for performance optimizations (`memo`, `useMemo`, `useCallback`, dependency arrays). Mutating state — even in seemingly safe places — breaks these and introduces silent bugs that look like "the UI didn't update."

Common pitfalls:
- `array.push(item)` instead of `[...array, item]`
- `obj.field = value` instead of `{ ...obj, field: value }`
- Modifying nested objects in form state

## Decision
**All state updates use immutable patterns.** No exceptions in component code.

```ts
// WRONG
selected.add(id);
setSelected(selected);

// CORRECT
setSelected(prev => {
  const next = new Set(prev);
  next.add(id);
  return next;
});
```

Same rule applies to:
- Form drafts (`setDraft({ ...draft, field: value })`)
- Lists (`setItems([...items, newItem])` or filter/map)
- Server response merging in stores

Enforced by:
- Code review checklist (`CONTRIBUTING.md`)
- ESLint `no-param-reassign` rule
- TDD-style component tests on state hooks

## Alternatives Considered
- **Immer** — Convenient `produce()` API but adds runtime dep and obscures the pattern from readers. Not worth it for our team size
- **Mutable state with manual `forceUpdate`** — Defeats the React model
- **Class components with `setState`** — Same immutability requirement; we use hooks anyway

## Consequences
- **Positive**
  - `useEffect` dependency arrays behave predictably
  - `React.memo` works for free
  - Time-travel debugging possible in devtools
- **Negative**
  - Slightly more verbose
  - New contributors need to internalize the pattern
- **Neutral**
  - Pure functions everywhere → easier to test

## References
- [CONTRIBUTING.md](../CONTRIBUTING.md#code-style)
- React docs on immutability
