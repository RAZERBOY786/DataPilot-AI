---
name: DataPilot Royal Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#2d3449'
  on-tertiary: '#ffffff'
  tertiary-container: '#434b60'
  on-tertiary-container: '#b4bbd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  surface-canvas: '#F8FAFC'
  surface-subtle: '#F1F5F9'
  surface-card: '#FFFFFF'
  border-subtle: '#E2E8F0'
  border-focus: '#3B82F6'
  accent-glow: rgba(59, 130, 246, 0.15)
  sidebar-bg: '#0B132B'
  sidebar-active: '#1E40AF'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  kicker:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
  code-metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 260px
  sidebar-collapsed: 72px
  topbar-height: 64px
  gutter-xs: 0.25rem
  gutter-sm: 0.5rem
  gutter-md: 1rem
  gutter-lg: 1.5rem
  gutter-xl: 2rem
  gutter-2xl: 3rem
  card-pad-sm: 1rem
  card-pad-md: 1.5rem
  card-pad-lg: 2rem
---

## Brand & Style

This design system establishes a high-performance, enterprise-grade AI analytics interface engineered for data scientists, analysts, and enterprise leadership. Combining sovereign authority with fluid technological intelligence, the aesthetic draws upon modern corporate precision, technical data density, and restrained luminous accents.

The interface mood balances surgical clarity with executive elegance. While standard enterprise dashboards often feel cold or cluttered, this system anchors raw data complexity within calm slate-gray foundations, razor-sharp borders, pure white surface elevations, and strategic bursts of royal and electric blue glow. The result evokes decisive intelligence, technical confidence, and operational speed.

## Colors

The palette is anchored by deep royal blue (`#1E40AF`) and energetic electric blue (`#3B82F6`), symbolizing deep computational power and active machine intelligence. Slate navy (`#0F172A`) provides typographic weight and high-contrast structural containment for deep navigation contexts like the vertical sidebar.

Surfaces leverage three clean steps:
- **Canvas Base (`#F8FAFC`)**: A cool, clinical canvas backdrop that minimizes glare while keeping contrast elevated.
- **Muted Surface (`#F1F5F9`)**: Used for table headers, inactive controls, drag zones, and container recesses.
- **Card Elevated (`#FFFFFF`)**: Pure white layered cards providing contrast against canvas gray.

Accents are deployed with restraint: glowing royal highlights (`rgba(59, 130, 246, 0.15)`) signal focus states, live AI inference passes, and primary metrics, eliminating visual noise in dense multi-metric dashboards.

## Typography

The type system pairs **Plus Jakarta Sans** for structural elements and section headers with **Inter** for data grids, body descriptions, code markers, and complex analytical telemetry. 

- **Plus Jakarta Sans** injects architectural modernity into high-level navigation, section kickers, and module headings. The crisp geometric terminals maintain poise without appearing overly playful.
- **Inter** handles analytical data, metric readouts, tooltips, and conversational AI streams, delivering zero optical distortion across tabular figures and dense data tables.
- **Kickers**: Rendered in strict uppercase tracking (`0.08em`) to demarcate functional workflow stages (e.g., `DATA MANAGEMENT`, `EXPLORATORY DATA ANALYSIS`).

## Layout & Spacing

The layout is built on a responsive 12-column analytical grid with fixed navigational bounds:
- **Navigation Shell**: A fixed vertical command bar (260px desktop width) paired with a persistent 64px horizontal utility header containing file status, dataset breadcrumbs, and mode triggers.
- **Rhythm & Stacking**: Vertical module blocks adhere to a strict 8pt rhythm. Sequential workflow stages utilize `2rem` (32px) margins between distinct operational cards, while atomic card internals maintain `1.5rem` (24px) padding.
- **Breakpoints & Reflow**:
  - **Desktop (1280px+)**: Multi-column fluid grid. Staged modules split horizontally into dedicated action toolbars and preview canvases.
  - **Tablet (768px - 1279px)**: Sidebar transitions to icon-only mode (72px). Grid condenses to 6 columns. Split workflows (e.g., AI chat + dataset reference) collapse into stacked priority views.
  - **Mobile (<768px)**: Canvas margins condense to `1rem` (16px). Navigation transitions to a slide-over drawer.

## Elevation & Depth

Visual hierarchy uses crisp boundary containment instead of heavy dropshadows, ensuring maximum legibility for dense analytics:

1. **Ground Layer (Canvas)**: Non-elevated flat baseline (`#F8FAFC`).
2. **Structural Elevation (Cards & Panels)**: `#FFFFFF` surfaces paired with a crisp hairline border (`1px solid #E2E8F0`) and an ambient, low-opacity tint: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
3. **Interactive Hover & Drag Elevation**: Lifted card state featuring an electric blue subtle rim lighting effect: `0 10px 25px -5px rgba(30, 64, 175, 0.08), 0 0 0 1px rgba(59, 130, 246, 0.35)`.
4. **Active Modals & Flyouts**: Elevated `16px` with backdrop diffusion: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`, accompanied by a background glass blur `backdrop-filter: blur(8px)`.

## Shapes

The design system adopts Level 2 (Rounded) corner geometry. Radii provide approachable tactility while maintaining structural engineering discipline:
- **Base Cards & Staging Panels**: `0.75rem` (12px) to `1rem` (16px) for major module frames.
- **Buttons, File Selectors & Text Fields**: `0.5rem` (8px) for balanced interactive balance.
- **Status Pills, AI Prompt Chips & Quick-Actions**: Fully rounded pill curves (`9999px`) to immediately distinguish contextual prompts from standard inputs and structural cards.
- **Dropzone Targets**: Soft interior nested radius (`0.75rem`) featuring a `2px` dashed stroke in `#CBD5E1`.

## Components

### Action Buttons
- **Primary CTA**: Solid deep royal blue (`#1E40AF`) with pure white text, transitioning to electric blue (`#3B82F6`) on hover with a localized glow (`box-shadow: 0 0 16px rgba(59, 130, 246, 0.35)`). Standard height: 40px (Desktop), 44px (Mobile).
- **Secondary / Action Toolbars**: Crisp white fill with hairline border (`#E2E8F0`), `#0F172A` text, and a slight `#F8FAFC` surface shift on hover.
- **Destructive / Alert**: Transparent fill with `#EF4444` border and text; fills on hover with subtle red sheen.

### Prompt Chips & AI Badges
- **AI Action Pills**: Pill-shaped (`rounded-full`), `#F1F5F9` background, `#1E40AF` text, and hairline `#E2E8F0` border. On hover, background shifts to `#EFF6FF` and border illuminates to `#3B82F6`.
- **System Status Badge**: Miniature pill containing an active pulsing green dot (`#10B981`) alongside label `AI Ready` with uppercase 11px font weight.

### Dropzone & File Management
- **Staging Canvas**: Contained within elevated white cards. Drop target features `#F8FAFC` fill, `2px` dashed border (`#CBD5E1`), centered icon container with light royal blue wash (`#EFF6FF`), and a dedicated elevated action button (`Choose File`).
- **Filetype Badges**: Monospace-styled small pills (`CSV`, `Excel`, `JSON`) rendered in `#64748B` neutral tone with rounded `4px` borders.

### Input Fields & Search Bars
- **Chat & Filter Bars**: 44px input fields with `#FFFFFF` fill, `#E2E8F0` border, and recessed slate placeholder text. Focus rings display crisp dual borders: a 1px `#3B82F6` primary stroke overlaid with a 3px diffused outer halo (`rgba(59, 130, 246, 0.15)`).

### Stats Cards & Telemetry Grid
- High-density KPI cards displaying an uppercase kicker, large numeric value (`28px` bold tabular numerals), and real-time delta indicators (+/- percent badges in soft green or red rounded tags).