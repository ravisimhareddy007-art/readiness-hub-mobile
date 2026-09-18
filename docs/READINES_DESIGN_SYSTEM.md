# ReadiNes Design System — Source of Truth

Read this before making any UI change, in any session, on any surface.

## Brand personality (locked)

Calm · Warm · Optimistic · Proactive · Human · Trustworthy · Premium.
Never: clinical, alarmist, corporate, dashboard-heavy, fear-driven.
The emotional message of every screen: "You're okay. We've got this. You're getting ready."
ReadiNes must never visually communicate crisis, fear, urgency or medical anxiety unless the underlying information genuinely requires urgency. This is a product principle, not a styling preference.

## Color roles (roles locked; hex values tune against real UI)

| Role | Token | Dark value | Light value |
|---|---|---|---|
| Foundation / background | `T.navy` | #0B1220 | #F2F3F5 (porcelain) |
| Surface / card | `T.panel` | #131C2E | #FFFFFF |
| Raised surface | `T.raised` | #1B2740 | #EAECF0 |
| Border | `T.border` | #27324A | #E3E6EA |
| Primary text | `T.white` | #FFFFFF | #1B2431 (ink) |
| Body text | `T.text` | #E6EBF5 | #39424F |
| Secondary text | `T.muted` | #8A97AE | #6E7480 (slate) |
| Action (interaction) | `SEM.action` | #35A7A0 (teal) | #087F8C (teal) |
| Readiness highlight | `T.gold` | #D9B86A | #AD7F1F (brass) |
| Success | `SEM.success` | #2FB68A | #2E8B68 |
| Warning | `SEM.warning` | #D98A2B | #B06F1E |
| Attention (not alarm) | `SEM.attention` | #E8736A | #D66B5D |
| Info | `SEM.info` | #5B8DEF | #4387B5 |

Module identities: Documents `A.blue`, Packages `A.green`, Health `A.pink`, Wealth `A.gold`, Family `A.purple`.

**Gold rule.** Gold means readiness, achievement, premium moments and important highlights only. Gold is never body text, never a border color, never every icon, never every button. Interactive primaries and selected states use teal (`SEM.action`).

**Themes are designed, never derived.** Light and dark share the same semantic tokens with different values. Inversion filters are banned. Every color in product UI comes from a token or a theme variable; hard-coded hex or rgba values in components are a defect, because they were written against one canvas and break on the other.

## Scales

- Spacing (8-point): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. No arbitrary values.
- Typeface: the platform system font, always (`-apple-system` → SF Pro on iOS, Roboto on Android, Segoe on Windows). Inter and other web-default faces are banned from product UI — they read as template. Headings and bold text carry -0.015em tracking; all numbers render tabular (`font-variant-numeric: tabular-nums`). JetBrains Mono only for deliberate monospace moments.
- Type: Display 32 · H1 28 · H2 22 · H3 18 · Body 16 · Small 14 · Caption 12 (mobile screen titles 18). No random sizes. Inputs never below 16px on mobile (iOS zoom).
- Radius: sm 8 · control 10 · card 16 · large card 20 · sheet 24. Pills are reserved for status, filters, compact metadata and selected states — not for buttons.
- Motion: fast 120ms · standard 200ms · slow 320ms. Calm motion only: gentle expansion, animated rings, spring sheets, subtle settle on completion. Nothing flashy.

## Implementation map (this codebase)

- Tokens live in `src/App.tsx`: `T` (surfaces/text), `A` (module identities), `SEM` (action + status), `DS` (space/type/radius/motion), with `*_DARK` / `*_LIGHT` palettes and `applyTheme()`. Health consumes the same system through `C` + `applyC()` in `src/components/Healthcare.tsx`.
- CSS variables (`--lpv-*`, `--m-*`, `--r-*`) mirror the tokens for stylesheet rules; `[data-theme="light"]` carries light values.
- The living laboratory is the **Design system** screen (avatar menu → Design system, route `design`). Every new component appears there before it appears on a product screen.

## One structure, two modes

Dark and light are the same screens with the same components in the same places; only surface and text values change. Nothing exists in one mode that does not exist in the other. Every app screen is framed by the brand: a navy band across the top (nav bar, and the greeting on Home) with white text, and a navy tab bar with teal for the active item. In dark the band is a shade lifted from the canvas; in light it is the brand navy. Cards float in the lit space between. Tints on tiles and chips are mixed from the module color into the surface color, so they read correctly on both canvases without mode-specific values.

## Mobile grammar

Every screen: compact one-line contextual header (Level 1, tiny) → primary content immediately (Level 2, large) → prominent primary action (Level 3) → compact secondary controls (Level 4) → content (Level 5). Search is contextual, never permanent chrome; global search is an icon in the nav area opening a full-screen overlay. Filters, sorts, upload options and secondary actions live in bottom sheets. Descriptive prose lives in onboarding or help, never permanently on screen. Bottom navigation: five fixed destinations (Home, Documents, Packages, Health, Wealth), visually quiet, active state is a soft pill in teal.

## The non-negotiable rule

Do NOT redesign individual screens independently. Before modifying any screen, determine whether the change belongs at: (1) design token, (2) theme, (3) component, (4) pattern, (5) screen — and implement at the highest reusable level possible. If the same visual treatment appears in multiple places, modify the shared token/component once and let consumers inherit. Never introduce arbitrary colors, font sizes, spacing, radii, shadows, button styles, card styles or navigation styles that are not in this system or explicitly approved as new system entries. When a request conflicts with the system, stop and identify the system-level change instead of a screen-specific workaround. The goal is systemic consistency across the product, and web and mobile must read as the same product through shared tokens, typography, iconography, spacing rhythm and personality.

## Migration order

Design system → Home → Health (the stress test) → Person Health → Documents → Wealth → Packages → remaining. At each step the question is "does this screen correctly consume the system?", never "how should this screen look?".
