# ReadiNes Design System 1.0

# ReadiNes Design System 1.0

Single source of truth for every ReadiNes screen on web and in the app. Lineage: foundation, token architecture and governance rules inherited from AppViewX DS 3.0; colour, type scale, control sizes and the component set re-authored for a consumer phone app used by every age group.

## Authority and precedence
1. `src/styles/tokens.css` in the repo (generated from `tokens/Light.tokens.json` and `tokens/Dark.tokens.json`) for token names and values.
2. This skill for token-consumption laws and routing.
3. `readines-components` skill for component anatomy, sizes, states and behaviour.
4. The screen's own content, data and routes.
When two rules conflict, the narrowest owner wins. Superseded rules are removed, never kept alongside new ones.

## Laws (non-negotiable)
- **Semantic only.** Screens and components consume CSS variables from `tokens.css`. No literal hex, rgb, px font size, px radius, px shadow, font-family or z-index anywhere else. A missing token is requested and added to the token files, never patched inline.
- **Highest reusable level.** Change order is token → theme → component → pattern → screen. A fix that touches one screen is wrong if the pattern class exists elsewhere.
- **Two authored themes.** Light and Dark are separate token files. No inversion filters, no derived themes, no theme colours stored in component code.
- **Platform font only.** `--font-family-ui` resolves to SF Pro on iOS, Roboto on Android, Segoe on Windows. Inter and any web-default face are banned. Numbers use `tabular-nums`.
- **Nothing below 12px** including chips and captions. `caption/md` (12/500) is the floor.
- **Hit area 44.** Every tappable element has at least 44px touchable height; `control/size/default` is 44. `compact` (32) is allowed only for non-tappable inline chips and segment controls inside a 44 row.
- **Status is not brand.** Plum (`action/primary`) is the only brand hue. Green, amber, red and blue are `status/success|warning|danger|info` and mean Ready, Expiring, Missing, In progress. The brand hue never signals a state and status colours never decorate.
- **State is never colour alone.** Every status pairs colour with a word or icon.
- **Destructive actions confirm; one-way states offer a reverse.**
- **Money in the user's home currency, dates in the device locale.** Never hard-coded.
- **Calm tone.** No fear framing in copy, empty states or warnings.
- **Elevation by role.** `--elevation-raised` for tiles and lists, `--elevation-overlay` for sheets, dialogs and toasts. Nothing else casts a shadow. Borders are `border/subtle` dividers or `border/default` on inputs only.

## Token contract (names are stable; values live in tokens.css)
**Colour roles** (`--color-<role>`): `surface/canvas|default|secondary|raised|inset|disabled|inverse|hover|brand-tint`; `text/heading|primary|secondary|tertiary|disabled|inverse|interactive|link|destructive|on-brand`; `icon/primary|secondary|disabled|inverse|interactive|link`; `border/subtle|default|emphasis|hover|disabled|interactive|destructive|destructive-hover`; `action/primary|secondary|tertiary|destructive|neutral` × `default|hover|pressed|disabled`; `status/success|warning|danger|info` × `surface|border|text|icon`; `focus/ring/default|inverse`; `selection/surface|border|text|icon`; `overlay/backdrop|scrim|highlight`.

**Light values (reference only):** canvas `#F6F7FA`, default `#FFFFFF`, secondary `#EEEFF5`, inverse `#17141F`, brand-tint `#F1ECF8`; text heading `#1B1626`, primary `#2A2435`, secondary `#5D5869`, tertiary `#736D7F`; action primary `#5E3A99` / hover `#6F4BAE` / pressed `#4C2D80`; destructive `#C62F38`; success icon `#1F8A4C`, warning icon `#9A6B00`, danger icon `#C62F38`, info icon `#2F6FDB`.
**Dark values (reference only):** canvas `#131019`, default `#1B1724`, secondary `#241F30`, raised `#231E2E`; text heading `#F5F3F9`, primary `#E9E6F0`, secondary `#B5B0C2`; action primary `#A784DE` with `text/on-brand` `#17141F`.

**Space** `--space-0|025|050|075|100|150|200|250|300|400|500|600` = 0 2 4 6 8 12 16 20 24 32 40 48. Page gutter `--layout-gutter` 16, `--layout-section-gap` 24, `--layout-content-width` 600.
**Radius** `--control-radius` 8, `--surface-radius` 12, `--tile-radius` 16, `--overlay-radius` 20, `--pill-radius`.
**Sizes** control 32/44/52; inline 20/24/28; icon 16/20/24/32; list row 56/64/72; tab bar 56; app bar 56; touch 44/48; focus ring 2+2; divider 1.
**Type roles** (class `.t-<role>` or the four variables `--text-<role>-size|weight|line-height|letter-spacing`): display/lg 34/700, display/md 28/700, heading/xl 24/700, heading/lg 22/600, heading/md 20/600, heading/sm 17/600, heading/xs 15/600, body/lg 17/400, body/md 15/400, body/sm 13/400, label/lg 17/500, label/md 15/500, label/sm 13/500, caption/md 12/500, numeric/lg 28/700, numeric/md 20/600.
**Motion** `--motion-duration-fast|default|slow` 120/200/320 ms, zero under reduced motion.

## Hierarchy recipe (so headings, information, fields and values are never the same size)
- Screen title: heading/xl in `text/heading`. Section title: heading/xs in `text/heading`. Tile title: label/md. Row primary: body/md in `text/primary`. Row secondary: body/sm in `text/tertiary`. Field label: label/md. Field value: body/md. Big number: numeric/lg in `text/heading`. Chip: caption/md.

## Routing
| Need | Owner |
|---|---|
| Buttons, icon buttons, text links | `readines-components` §Button |
| Inputs, select, date, toggle, checkbox, radio | `readines-components` §Fields |
| Module tile, list row, hero score, document thumbnail, person chip | `readines-components` §Content |
| Tab bar, app bar, segment control, tabs | `readines-components` §Navigation |
| Bottom sheet, dialog, toast, callout, banner, empty state, skeleton | `readines-components` §Feedback and overlays |
| Readiness score, progress, status chips | `readines-components` §Status |
| Page composition | `readines-components` §Screen template |

Not part of ReadiNes (do not import from DS 3.0): sidebar, breadcrumbs, help panel, data tables and all table sub-skills, filter panel, column settings, inventory and KPI-inventory templates, rich text editor, code block.

## Delivery rules for this product
- Changes are delivered as Lovable paste prompts with full file contents per file (App.tsx may go as a file; `.ts` files go as `.txt` twins).
- Every change runs the regression gate (`npm run regress`); the banned-pattern sweep fails on literal colours, px font sizes, px radii, `font-family`, Inter, sub-12px sizes, hard-coded locale or currency.
- The Design System Showcase screen (avatar menu → Design system) receives a component before any product screen does.
- Migration order: showcase → Home → Health → Person Health → Documents → Wealth → Packages.

# ReadiNes components

All measurements are token references; the pixel value in brackets is the current resolved value for reading only. Every component consumes `tokens.css` variables and the `.t-<role>` type classes. Nothing here is restyled per screen.

## Screen template
```
Screen
├── App bar (--appbar-height 56): title heading/sm left, one avatar or one icon action right, canvas background, no border
├── Scroll body: padding 0 --layout-gutter --space-300; sections stacked with gap --layout-section-gap
│   ├── Hero (optional, one per screen)
│   ├── Tile grid or list
│   └── Sections: section title heading/xs + content, gap --space-100
└── Tab bar (--tabbar-height 56 + safe-area) on the five root screens only
```
Rules: one primary button per screen; the most important action sits in the first viewport; drill-through screens replace the tab bar with a back action in the app bar; content width caps at `--layout-content-width` (600) on tablet and web, centred.

## Button
Appearance: primary (plum fill, `text/on-brand`), secondary (`action/secondary` fill + `border/default`, `text/primary`), tertiary (no fill, `text/interactive`), destructive (red fill, `text/inverse`).
Size: default `control/size/default` (44), large `control/size/large` (52) for the screen's one main action, compact (32) only inside a 44 row for inline actions. Padding `control/padding/*`, gap `control/gap`, radius `control/radius`, min width `control/width/min`. Label: label/md (label/lg on large). Icon `icon/size/md`.
States: hover, pressed, disabled (`*/disabled` fill + `text/disabled`), loading (spinner replaces leading icon, label stays, no resize), focus-visible (`focus/ring`). Full-width variant stretches to the gutter.
Icon button: square at the same sizes, needs `aria-label`. Text link: `text/link`, underline on hover, label/md.

## Fields
Field = label (label/md, `text/primary`) + control + optional helper (body/sm, `text/tertiary`; error in `text/destructive`). Gap `space/075`. Required is marked in the label, never by colour alone.
Text input: height 44, padding `control/padding/default`, radius `control/radius`, `border/default`, placeholder `text/tertiary`, focus `border/interactive` + ring, error `border/destructive`, disabled `surface/disabled`. Leading or trailing icon `icon/size/md`. Search variant has a leading search icon and a clear action.
Select: same frame, trailing chevron, opens a bottom sheet on phone (never a native dropdown list taller than the viewport).
Date: same frame, opens the platform date picker; renders in device locale.
Toggle: 48×28 pill, on = `action/primary`, off = `action/neutral`, label on the left, 44 row.
Checkbox and radio: 20px control inside a 44 row; label body/md; group gap `space/100`; card variant (selectable tile) uses `selection/surface` + `selection/border` when selected.
Enterprise rule carried over: no explanatory helper text unless the field truly needs it; helper is one line.

## Content
Module tile: `surface/default`, radius `tile/radius`, padding `space/200`, min height 112, `--elevation-raised`. Anatomy: icon well (36×36, radius 10, `surface/brand-tint`, icon `icon/interactive` 20) top-left, title label/md `text/heading`, one line of status body/sm `text/secondary` bottom. Two columns, gap `space/150`. Whole tile is the tap target.
List row: min height `list/row/default` (56), 64 with a second line, 72 with a thumbnail; padding `space/100 space/200`; leading icon 24 `icon/secondary` or thumbnail 40; text column (primary body/md `text/primary`, secondary body/sm `text/tertiary`, each one line with ellipsis); trailing chip or chevron. Rows separated by `border/subtle` dividers inside a `surface/default` container with `surface/radius` and `--elevation-raised`. Swipe actions are not used; actions live in the row's detail screen.
Hero score: `surface/default` card, radius `tile/radius`, padding `space/250`, eyebrow label/sm `text/secondary`, progress ring 64 (track `surface/secondary`, fill `status/success/icon` when ≥ 70, `status/warning/icon` 40 to 69, `status/danger/icon` below 40), number numeric/lg `text/heading` with "of 100" body/md, one sentence body/sm, one primary full-width button.
Document thumbnail: 40×52 (row) or 72×96 (grid), radius `control/radius`, `border/subtle`, file-type glyph centred when no preview.
Person chip: avatar 24 + name label/sm in a pill (`surface/secondary`); selected uses `selection/*`.

## Navigation
Tab bar: five items max, icon 24 + caption/md, active `text/interactive`, inactive `icon/secondary`, `surface/default` with `border/subtle` top, height 56 plus safe area. Labels are always shown.
App bar: 56, title heading/sm, no elevation, canvas background; one trailing action; back chevron leading on drill-through.
Segment control: pill track `surface/secondary`, padding `space/025`, items compact height 32 inside a 44 row, selected `surface/default` + raised shadow + label/sm 600. Two to four items.
Tabs (inside a screen): label/md, active `text/interactive` with 2px `border/interactive` underline, inactive `text/secondary`, scrollable row, 44 height.

## Status
Chip: height `inline/size/default` (24), padding `inline/padding/default`, pill, caption/md, 1px border; variants success Ready, warning Expiring, danger Missing, info In progress, neutral Optional. Always carries a word. In a tappable row, the row provides the 44 hit area.
Progress bar: 6px track `surface/secondary`, fill by the same threshold rule as the hero ring, pill ends.
Readiness thresholds (one place): ≥ 70 success, 40 to 69 warning, < 40 danger.

## Feedback and overlays
Callout: `status/*/surface` + `status/*/border`, radius `surface/radius`, padding `space/150 space/200`, body/sm in `status/*/text`, optional leading icon 20. Info and warning only on screens; danger only inside a pack's missing-items list.
Banner: full-width, same tokens as callout, no radius, used for account-level notices.
Toast: `surface/inverse` + `text/inverse`, radius `surface/radius`, `--elevation-overlay`, body/md, one optional action in `text/link` on inverse, 4 s, bottom above the tab bar.
Bottom sheet: `surface/default`, top radius `overlay/radius`, handle `sheet/handle/*`, padding `space/200 --layout-gutter`, `overlay/backdrop` behind, header heading/sm, max 85 percent height, scroll inside. Default host for selects, filters and secondary actions.
Dialog: centred, width min(--layout-content-width, 100% − 2 gutters), radius `overlay/radius`, padding `space/250`, title heading/md, body body/md `text/secondary`, actions right-aligned (secondary then primary; destructive replaces primary for delete). Used only for confirmations.
Empty state: icon well 56 in `surface/brand-tint`, title heading/sm, one sentence body/md `text/secondary`, one primary button; calm copy, never alarm.
Skeleton: `surface/secondary` blocks at the component's real dimensions, pulse at `--motion-duration-slow`, off under reduced motion.
