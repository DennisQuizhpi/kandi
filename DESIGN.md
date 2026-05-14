---
name: Kandi
description: Tactile bracelet design and sharing with a refined, low-friction editor.
colors:
  page-bg: "#ffffff"
  page-text: "#262626"
  selection-accent: "#5d77ff"
  panel-surface: "#f4f4f4"
  panel-surface-elevated: "#ffffff"
  elevated-surface-bg: "#ffffff"
  elevated-surface-border: "#f2f2f2"
  elevated-surface-shadow: "0 14px 24px rgba(0,0,0,0.14)"
  field-surface: "#f4f4f4"
  border-muted: "#f2f2f2"
  border-strong: "oklch(0.59 0.03 252 / 0.45)"
  text-muted: "#8f8f91"
  text-secondary: "#8f8f91"
  text-strong: "#262626"
  action-ink: "#101318"
  action-paper: "#ffffff"
  danger-surface: "oklch(0.92 0.03 13)"
  danger-text: "oklch(0.42 0.09 18)"
typography:
  display:
    fontFamily: '"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif'
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  title:
    fontFamily: '"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif'
    fontSize: "0.86rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.01em"
  body:
    fontFamily: '"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif'
    fontSize: "0.88rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: '"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif'
    fontSize: "0.77rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "0.45rem"
  md: "0.58rem"
  lg: "0.75rem"
  xl: "0.92rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.selection-accent}"
    textColor: "oklch(0.99 0.005 250)"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.9rem"
  button-secondary:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.page-text}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.9rem"
  field-default:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.page-text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.75rem"
  panel-elevated-light:
    backgroundColor: "{colors.elevated-surface-bg}"
    borderColor: "{colors.elevated-surface-border}"
    boxShadow: "{colors.elevated-surface-shadow}"
    textColor: "{colors.page-text}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: Kandi

## 1. Overview

**Creative North Star: "The Midnight Bead Bench"**

The bracelet stays the hero; chrome stays calm and readable. **As implemented in the app**, the editor shell uses a **light workbench**: white page, soft neutral fields, and **elevated floating surfaces** (menus, dialogs, dock inspector, shortcuts panel, guided camera buttons, share toast) that share one card vocabulary.

This system is built for fast creative iteration, not decorative spectacle. Typography carries hierarchy; elevated panels read as crisp tools sitting above the canvas.

**Key Characteristics:**
- Light shell with restrained accent use (`--accent` / selection blue in CSS).
- Compact typographic hierarchy (`k-type-*` utilities).
- **Elevated surfaces**: opaque white cards with cool-gray hairline border and a single soft shadow (see §4).
- **Secondary text** at **`#8f8f91`** (`--text-muted` in `globals.css`) for labels, meta lines, and shortcut keycaps.
- **Flat controls:** primary and secondary `KandiButton` variants do **not** use hover shadows or decorative lifts; elevation stays on explicit shells only.
- High-trust interaction states (focus, hover, disabled).

### Implementation sync (elevated surfaces)

Floating UI shares the **keyboard shortcuts panel** reference:

| Token (`globals.css`) | Role |
|----------------------|------|
| `--elevated-surface-bg` | Card fill (`#ffffff`) |
| `--elevated-surface-border` | Card outline (`#f2f2f2`) |
| `--elevated-surface-shadow` | Card shadow (`0 14px 24px rgba(0,0,0,0.14)`) |

Tailwind/class reuse: `kandiElevatedSurfaceClassName` and `kandiElevatedSurfaceForcedClassName` in `src/lib/kandi/constants.ts`. `--panel` / `--panel-elevated` alias the elevated bg so legacy references stay aligned.

Primary buttons no longer lighten hover via `--panel-elevated`; hover uses **`color-mix`** on the accent so contrast stays correct on solid white shells.

## 2. Colors

### Primary
- **Workbench Blue** (`#5d77ff` family via `--accent` oklch): Selection, focus, primary actions.

### Neutral (light shell)
- **Page** (`#ffffff` / `--surface-0`, `--page-bg`): Canvas backdrop.
- **Ink strong** (`--text-strong`): Primary UI copy.
- **Ink secondary** (`#8f8f91`, **`--text-muted`**): Supporting labels, helper/meta text, shortcut keycap glyphs. **Treat `#8f8f91` as the canonical secondary text color** in design specs and Figma.
- **Fields / toolbar tint** (`#f4f4f4`, `--surface-1` / `--field`): Inputs and dense toolbar pills.
- **Elevated card** (`#ffffff`, `--elevated-surface-bg`): Floating panels and dialogs.
- **Elevated border** (`#f2f2f2`, `--elevated-surface-border`): Hairline around elevated cards (matches shortcut chip track).

### Named Rules
**The One Accent Rule.** Accent exists for focus and primary actions, not decoration.

## 3. Typography

**Display Font:** Soehne stack (`"Soehne", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif`)

**Character:** Utility typography—precise, minimal flourish.

### Hierarchy
- **Display / Headline / Title / Body / Label / Meta:** See `k-type-*` in `globals.css` (sizes align with YAML `typography` above).

### Named Rules
**The Utility Density Rule.** Prefer weight contrast before large size jumps.

## 4. Elevation

Depth on floating chrome comes from **one light shadow vocabulary**, not heavy dark lifts.

### Elevated shell (reference: shortcuts panel)
- **Fill:** `#ffffff`
- **Border:** `#f2f2f2`
- **Shadow:** `0 14px 24px rgba(0, 0, 0, 0.14)`

Applied to: design menu, shortcuts dialog, bead counter chip, guided tilt FABs, multi-select chip bar shell, dock mode tabs shell, single-bead inspector shell, share modal card, share status toast, canvas affordances (insert/delete/copy), share view header pill and camera controls.

Backdrop blur was removed from these shells so cards stay **opaque and paper-like**, consistent with the shortcuts panel.

### Named Rules
**The State-Driven Lift Rule.** Shadow explains layering (floating panels, dialogs); avoid decorative darkness.

**The Restraint Rule (shadows & effects).** Do not add shadows, blur, glow, or motion on controls **unless** there is an explicit reason (layering documentation, accessibility focus, loading state). **Primary and secondary text buttons:** tint or color change on hover only—**no hover shadow.** Other button variants (`compact`, `shape`, toggles) follow the same default: no gratuitous hover lift. If an effect is required for a specific pattern, call it out in copy or design notes as intentional.

## 5. Components

### Buttons
- **Primary:** Accent fill with readable ink; hover uses mixed lighter accent only—no drop shadow (`KandiButton` base omits hover shadow for primary/secondary).
- **Secondary:** Transparent chrome; hover background tint only.
- **compact / shape / toggle:** Neutral fills per variant; rely on fill/border—not shadow—for hover unless a separately documented exception applies.
- **Focus:** Visible accent outline (`color-mix` on `--accent`).

### Cards / elevated containers
- **Background:** `--elevated-surface-bg`
- **Border:** `--elevated-surface-border`
- **Shadow:** `--elevated-surface-shadow`
- **Corners:** `rounded-lg`–`rounded-2xl` by density (dialogs larger).

### Inputs / Fields
- Light fields (`--field`), soft borders (`--border-soft`), explicit focus ring on accent.

### Shortcut hints
- Keycap track: `--elevated-surface-border` fill; glyph color **`--text-muted` (`#8f8f91`)**.

## 6. Do's and Don'ts

### Do:
- **Do** use **`--text-muted` / `#8f8f91`** for secondary copy and keyboard hints.
- **Do** use the elevated tokens (`--elevated-surface-*` or `kandiElevatedSurfaceClassName`) for any new floating panel.
- **Do** keep focus rings explicit.

### Don't:
- **Don't** put hover drop shadows or “lift” animations on **`KandiButton` primary or secondary** (or similar plain controls)—keep feedback to surface/color.
- **Don't** add ornamental shadows, glows, or blur on UI chrome without an explicit layering or accessibility rationale documented in design or AGENTS/spec.
- **Don't** mix unrelated shadows (heavy `rgba(0,0,0,0.45)` lifts) on elevated cards—stay with the shortcuts-panel vocabulary unless breaking glass for a deliberate, noted exception.
- **Don't** approximate secondary text with generic gray; anchor to **`#8f8f91`**.

