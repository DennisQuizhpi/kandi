<!-- BEGIN:nextjs-agent-rules -->

# Agent rules

## Next.js

This is **not** the Next.js from older training data: APIs, conventions, and layout can differ. Before changing app routes or config, read the relevant guide under `node_modules/next/dist/docs/` and follow current deprecation notices.

## Visual inspiration

Screenshots and external mocks are for **layout, grouping, and behavior cues** unless the user explicitly asks to match their visual style (colors, light vs dark theme, etc.). Implement using this app’s existing UI tokens (frosted panels, shared buttons, sidebar-style borders and focus rings on the **main editor shell**) so new chrome stays consistent with the current design system.

## Motion design

Patterns for **floating panels that interact with a React Three Fiber scene**:

- **Dismiss overlays vs the 3D canvas:** Avoid closing a dock or popover on **`document` `mousedown`** when the user might be **selecting scene geometry**. R3F **`onClick` runs after `mousedown`/`mouseup`**; if `mousedown` clears selection or unmounts the panel first, you get a flash or missed selection. **Treat pointer-down inside the DOM subtree that wraps `<Canvas>` as “not outside”** for dismiss logic (e.g. pass that container’s ref into the overlay). Keep scene selection driven by **mesh pointer handlers** and **canvas pointer-missed** behavior, not by the overlay’s outside-click detector alone.
- **Layout continuity (Framer Motion):** Using **`key={id}`** on a panel that should smoothly **resize when switching items** forces a remount—**`layout` cannot interpolate** across unmounts. Prefer **one persistent panel** and reset local UI state in **`useEffect` when the focused entity `id` changes** (not on every unrelated prop update).
- **`layout` nesting:** Stacking **`layout`** on both an outer shell and an inner content wrapper often produces **wrong or jittery height** animations. Use **`layout` on a single outer `motion.div`** (the frosted shell) and plain containers inside.

## Primitives (components and DOM)

Do **not** introduce new primitives when something already fits the job.

- **UI:** Prefer extending existing atoms under **`src/components/kandi/`** (shared buttons, color swatches, and the same panel/input class strings as the editor). If you need a one-off layout, compose those pieces or plain semantic HTML with the same Tailwind vocabulary—avoid new wrapper “design system” components unless the user asks for abstraction.
- **3D:** Reuse established geometry factories, instancing, and text-on-mesh patterns **in the same canvas module** (`src/components/kandi/`). Pull sizing/hole alignment constants from **`src/lib/kandi/`** where they live today. Do not add a second bead mesh stack, typography system, or instancing approach for the same use case.

## Beads (styling and where it lives)

**Data**

- Types and patches: domain types and patch shapes in **`src/lib/kandi/types`**; mutations in **`src/lib/kandi/patch.ts`** and **`src/lib/kandi/store.ts`**.
- **Letter beads:** Non-empty label implies cube-shaped bead logic (enforced on patch and normalization). Product rule: letter beads are visually **white** (`#ffffff`)—keep that rule next to the **single-bead inspector**, not scattered across the tree.

**Editing UI**

- Single selected bead only: the **bottom dock / inspector** for one bead should mirror the editor’s frosted panel tokens (`border-[#ffffff14]`, `#1a1c21`-style fills). Reuse the shared button variants, swatch control, and **`focus:outline-[#5d77ff99]`**-family rings—no bespoke button stack.

**Canvas appearance**

- **Round beads without letters:** instanced perforated sphere geometry and shared standard-material treatment—extend the existing instanced path rather than duplicating meshes.
- **Letter beads:** one rounded perforated cube plus lateral **drei `Text`** (or equivalent) on four faces; body **off-white `#fdfdfd`**, glyph **`#101318`**—adjust via the constants colocated with the letter-face layout, not new parallel components.
- **Bracelet strand:** thin dark torus; tune tube radius and material **beside the strand mesh** in the canvas module.

When adjusting bead visuals, change **tokens** (Tailwind strings, THREE colors/sizes, geometry constants in **`src/lib/kandi/`**) inside these existing surfaces—still no parallel primitives.

<!-- END:nextjs-agent-rules -->
