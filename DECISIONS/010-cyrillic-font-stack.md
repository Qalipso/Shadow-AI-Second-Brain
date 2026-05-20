# ADR-010: Playfair Display + Inter for Cyrillic support

**Status:** Accepted
**Date:** 2026-05-20

## Context
Initial font choice was **Geist + Fraunces** for the dark-mystical aesthetic. Problem: Fraunces has no Cyrillic subset. User is Russian-speaking; Cyrillic text rendered with system fallback fonts looked broken next to elegant Latin display type.

Geist (sans-serif body) also lacks Cyrillic.

## Decision
Replace display + body fonts with Cyrillic-supporting alternatives:

| Role | Font | CSS var | Subset |
|------|------|---------|--------|
| Display (headings, hero) | **Playfair Display** | `--font-fraunces` (kept name for backwards compat) | `latin`, `cyrillic` |
| Body fallback | **Inter** | `--font-inter` | `latin`, `cyrillic` |
| Mono / UI text | Geist (kept) | `--font-geist` | `latin` |

`<html lang="ru">` for proper hyphenation + screen reader pronunciation.

Font stack in `globals.css`:
```css
--font-sans: var(--font-geist), var(--font-inter), system-ui, sans-serif;
```

Geist tries first (looks better for Latin); Inter takes over when Geist has no glyph (Cyrillic).

## Alternatives Considered
- **Add Noto Sans / Noto Serif** — Widest coverage but visually generic; loses the dark/mystical character
- **Cormorant + Manrope** — Both have Cyrillic but Cormorant felt too thin for display use at small sizes
- **Self-host Fraunces with custom Cyrillic glyphs** — Possible via extension fonts but legally murky and brittle
- **Switch only display font, leave body alone** — Body fallback still pulls system fonts (Times/Helvetica) which clash

## Consequences
- **Positive**
  - Russian text renders consistently with the brand
  - Kept the `--font-fraunces` CSS variable so existing `font-[family-name:var(--font-fraunces)]` usages didn't need to change
  - Playfair has very similar character to Fraunces (high contrast serif)
- **Negative**
  - Slightly larger initial font payload (~30KB extra woff2)
  - `lang="ru"` is a single-locale assumption; needs revisit for multi-lang
- **Neutral**
  - Geist still wins for Latin where available

## References
- [src/app/layout.tsx](../web/src/app/layout.tsx)
- [src/app/globals.css](../web/src/app/globals.css)
