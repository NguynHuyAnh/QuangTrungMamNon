---
name: Professional Educational Management
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434652'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#747783'
  outline-variant: '#c4c6d3'
  surface-tint: '#345baf'
  primary: '#002869'
  on-primary: '#ffffff'
  primary-container: '#0b3d91'
  on-primary-container: '#8dadff'
  inverse-primary: '#b1c5ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#00227a'
  on-tertiary: '#ffffff'
  tertiary-container: '#0f36a6'
  on-tertiary-container: '#97abff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001947'
  on-primary-fixed-variant: '#144296'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#b8c4ff'
  on-tertiary-fixed: '#001453'
  on-tertiary-fixed-variant: '#173bab'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 260px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

The design system is engineered to project stability, precision, and administrative excellence for preschool management. It balances the high-trust requirements of an educational institution with the modern efficiency of a technical SaaS platform. 

The visual direction follows a **Corporate / Modern** aesthetic. It prioritizes clarity and functional hierarchy to reduce cognitive load for administrators managing student records, attendance, and tuition. The atmosphere is professional and secure, utilizing a structured layout that feels institutional yet accessible. Every interaction is designed to feel intentional, reinforcing the reliability of the system as the backbone of school operations.

## Colors

The color palette centers on **Deep Blue (#0B3D91)** to establish authority and trust, making it the primary identifier for navigation and core actions. This is contrasted by **Orange (#F97316)**, which serves as a functional accent for critical data points, payment triggers (specifically ZaloPay integration), and call-to-action elements that require immediate attention.

The background system uses a dual-layer approach: **Light Gray (#F6F8FB)** for the canvas to provide a soft boundary for the interface, and **Pure White (#FFFFFF)** for cards and content containers to ensure maximum readability. Text utilizes **Charcoal Navy** for headers to maintain a strong typographic anchor, while **Slate Gray** is reserved for secondary information and metadata to prevent visual clutter.

## Typography

This design system utilizes **Inter** for its exceptional legibility in data-heavy environments. The typographic scale is optimized for Vietnamese diacritics, ensuring that accents and marks do not clash with line heights.

Headers use a tighter letter-spacing and heavier weights to stand out against the administrative backdrop. Body text is kept at a comfortable 14px or 16px to facilitate long-form data entry and reading. Labels and UI metadata employ medium and semi-bold weights to provide clear distinction between descriptions and actual data values.

## Layout & Spacing

The layout follows a **Fixed-Fluid hybrid grid**. A fixed left-hand sidebar (260px) houses the primary navigation, while the main content area utilizes a fluid 12-column grid system with 20px gutters. 

Spacing follows a strict 4px/8px baseline rhythm to ensure mathematical harmony across the dashboard. Large 24px-32px margins are used to separate major functional blocks (e.g., Student List vs. Filter Panel), while tighter 8px-16px spacing is used within cards to group related information like student profiles and their respective attendance status.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** combined with **Ambient Shadows**. The application background sits at the lowest level (Level 0). Content cards, tables, and panels occupy Level 1, using a subtle 4px blur shadow with low opacity (4-6%) to create a soft lift without appearing heavy.

Level 2 is reserved for interactive elements such as dropdowns, popovers, and hover states on cards, utilizing a slightly more pronounced shadow to indicate focus. Modals and urgent alerts occupy Level 3, featuring a significant backdrop blur (12px) to dim the background and center the user's attention on the administrative task at hand.

## Shapes

The shape language is defined as **Rounded**, utilizing an 8px (0.5rem) base radius for standard components like input fields, buttons, and badges. Larger containers and cards employ a 16px (1rem) radius to soften the technical nature of the dashboard and reflect the friendly, childcare-oriented context of the school.

Interactive elements like checkboxes use a smaller 4px radius to maintain precision, while primary action buttons and "ZaloPay" payment triggers maintain the 8px standard for a modern, tactile feel.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Deep Blue (#0B3D91) with white text. Hover state shifts to Tertiary Blue (#1E40AF).
- **CTA/Payment:** Solid Orange (#F97316). Specifically used for "Thanh toán ZaloPay" and "Nộp học phí".
- **Form Inputs:** 8px rounded corners, 1px Slate Gray border, turning Deep Blue on focus with a subtle glow.

### Cards & Data Tables
- **KPI Cards:** White background, 16px rounded corners, featuring large Orange numerals for metrics like "Tổng số học sinh" (Total Students).
- **Data Tables:** Clean rows with light gray dividers. Header rows use a subtle gray background (#F9FAFB) and bold Navy text. Interactive rows highlight with a soft blue tint on hover.

### Feedback & Status
- **Status Badges:** Use a "Pill" shape. Success (Đã đóng tiền) in Emerald, Pending (Chờ duyệt) in Orange, and Alert (Quá hạn) in Crimson.
- **Empty States:** Use simplified line illustrations and Slate Gray text to guide users when no data is available.

### Navigation
- **Sidebar:** Deep Blue background with semi-transparent white text for inactive items and a solid white/accent indicator for the active "Trang chủ" or "Quản lý lớp" links.