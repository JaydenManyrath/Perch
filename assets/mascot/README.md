# Mascot Assets — "Perch" the plush chick

Three SVGs of the same round plush-chick character. **Owned by Person A** (design system). See `CLAUDE.md` §9.

| File | What it is | Use for |
|---|---|---|
| `plush-chick-idle.svg` | Flattened, animation-ready. Breathe + blink + slow wing-sway loop. | Default resting mascot: empty states, idle onboarding, milestone beats. |
| `plush-chick-hop.svg` | Flattened, animation-ready. Hop + wing-flap + ground-shadow loop. | Loading / "working" states (negotiation running, matching, uploads). |
| `plush-chick-static-fur.svg` | High-detail `feTurbulence`+`feDisplacementMap` "fur" texture. Single static pose, **no** animation. | Large **static** hero placements only (e.g. splash). Do NOT animate — the filter stutters in loops. |

## Three fixes before shipping (Person A owns)

### 1. Recolor teal → baby blue (keep the orange)
The character is currently mint/teal. Recolor to the locked palette (see `docs/FOUNDATION-CONTRACT.md` → Design Tokens). Keep beak/feet orange (already the warm accent).

| Current | Role | Change to (token) |
|---|---|---|
| `#AEE4DE` | body fill | baby-blue body → `#BFE3F7` (`chick.body`) |
| `#8FC7E8` | wings / top tuft | deeper blue wing → `#7FB2DB` (`chick.wing`) |
| `#9AD0EF` | center tuft | `#8FC7E8` |
| `#CDEBE6` | body glow (soft2) | `#DCEFFB` |
| `#5FA79B` | under-shadow | `#5E7E97` (`ink.soft`) |
| `#7FB9C9` | belly seam | keep or `#9CC5DD` |
| `#F6A22C` / `#E5851C` / `#E9A24C` | beak + feet | **keep** (warm accent) |
| `#2B333B` | eyes | `#2C4A63` (`ink.strong`) or keep near-black |
| `#2C4A63` | shadow | keep (already deep blue) |

Do the same recolor across all three files. `static-fur` shares the exact same fills.

### 2. Keep flattened versions for animation
`idle` and `hop` are already flattened (no `fur` filter) — safe to loop. Only `static-fur` keeps the expensive filter, and only for static placement.

### 3. Supply the `@keyframes` (they are NOT in the SVG)
The animated SVGs reference `apBreathe`, `apWingSwaySlow`, `apBlink`, `apHop`, `apFlap`, `apShadow`. These live in **app CSS**, not the file. Starter set (drop into a global stylesheet or a Mascot component's `<style>`):

```css
@keyframes apBreathe   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-4px) scale(1.015)} }
@keyframes apWingSwaySlow { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-6deg)} }
@keyframes apBlink     { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(0.1)} }
@keyframes apHop       { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-26px)} 55%{transform:translateY(0)} 65%{transform:translateY(-6px)} 75%{transform:translateY(0)} }
@keyframes apFlap      { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-20deg)} }
@keyframes apShadow    { 0%,100%{transform:scale(1);opacity:.16} 30%{transform:scale(.7);opacity:.08} }
```

Respect `prefers-reduced-motion`: gate the loops behind `@media (prefers-reduced-motion: no-preference)` and fall back to the static pose.

## Placement rule (from §9)
The chick appears ONLY in personality moments — onboarding, loading, empty states, milestones. It is ABSENT from decision surfaces (listings, safety, money, map decisions). The chick handles emotion and waiting; the interface handles decisions.
