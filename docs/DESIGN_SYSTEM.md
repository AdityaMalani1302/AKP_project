# Smart ERP Design System

A comprehensive guide to the design tokens, components, and patterns used throughout the Smart ERP application.

---

## 1. Color Palette

### Primary Colors

| Token              | Hex       | Usage                                     |
| ------------------ | --------- | ----------------------------------------- |
| `--color-gray-900` | `#111827` | Primary text, dark buttons                |
| `--color-blue-600` | `#2563EB` | Interactive elements, links, focus states |
| `--color-white`    | `#FFFFFF` | Backgrounds, surfaces                     |

### Status Colors

| Status      | Background          | Text                 | When to Use                      |
| ----------- | ------------------- | -------------------- | -------------------------------- |
| **Success** | `--color-green-50`  | `--color-green-700`  | Confirmations, completed actions |
| **Warning** | `--color-yellow-50` | `--color-yellow-700` | Caution, pending states          |
| **Danger**  | `--color-red-50`    | `--color-red-700`    | Errors, destructive actions      |
| **Info**    | `--color-blue-50`   | `--color-blue-700`   | Informational messages           |

### Section Colors

Use these for form sections and grouped content:

```css
.section-blue    /* Details, primary info */
/* Details, primary info */
.section-green   /* Success, completed sections */
.section-yellow  /* Warnings, attention needed */
.section-purple  /* Quality/Lab data */
.section-gray    /* Records tables, neutral */
.section-orange  /* Casting/production data */
.section-teal; /* Core details */
```

### Gray Scale

| Token              | Hex       | Usage                    |
| ------------------ | --------- | ------------------------ |
| `--color-gray-50`  | `#F9FAFB` | Page background          |
| `--color-gray-100` | `#F3F4F6` | Card backgrounds         |
| `--color-gray-200` | `#E5E7EB` | Borders                  |
| `--color-gray-400` | `#9CA3AF` | Muted text, placeholders |
| `--color-gray-500` | `#6B7280` | Secondary text           |
| `--color-gray-700` | `#374151` | Body text                |
| `--color-gray-900` | `#111827` | Headings, primary text   |

---

## 2. Typography

### Font Family

```css
font-family: "Inter", sans-serif;
```

### Font Sizes

| Token              | Size   | Usage                       |
| ------------------ | ------ | --------------------------- |
| `--font-size-xs`   | 12px   | Labels, captions, badges    |
| `--font-size-sm`   | 14px   | Secondary text, table cells |
| `--font-size-base` | 16px   | Body text, inputs           |
| `--font-size-lg`   | 17.6px | Section titles              |
| `--font-size-xl`   | 20px   | Card headings               |
| `--font-size-2xl`  | 24px   | Page titles                 |

### Font Weights

| Token                    | Weight | Usage                 |
| ------------------------ | ------ | --------------------- |
| `--font-weight-normal`   | 400    | Body text             |
| `--font-weight-medium`   | 500    | Buttons, labels       |
| `--font-weight-semibold` | 600    | Section headings      |
| `--font-weight-bold`     | 700    | Page titles, emphasis |

### Line Height

Default: `1.5` (150%)

---

## 3. Spacing

### Spacing Scale

| Token           | Size    | Pixels | Usage                    |
| --------------- | ------- | ------ | ------------------------ |
| `--spacing-xs`  | 0.25rem | 4px    | Tight gaps               |
| `--spacing-sm`  | 0.5rem  | 8px    | Icon gaps, small padding |
| `--spacing-md`  | 0.75rem | 12px   | Form field padding       |
| `--spacing-lg`  | 1rem    | 16px   | Section margins          |
| `--spacing-xl`  | 1.25rem | 20px   | Card padding             |
| `--spacing-2xl` | 1.5rem  | 24px   | Section spacing          |
| `--spacing-3xl` | 2rem    | 32px   | Large gaps               |

### Usage Guidelines

- **Form fields**: `--spacing-md` padding
- **Cards**: `--spacing-lg` or `--spacing-xl` padding
- **Sections**: `--spacing-2xl` margin-bottom
- **Icon + text**: `--spacing-sm` gap

---

## 4. Components

### Buttons

```html
<!-- Primary (dark) -->
<button class="btn btn-primary">Submit</button>

<!-- Accent (blue) -->
<button class="btn btn-accent">Save</button>

<!-- Secondary (outline) -->
<button class="btn btn-secondary">Cancel</button>

<!-- With animations -->
<button class="btn btn-primary btn-ripple btn-hover-scale">Submit</button>
```

| Variant   | Class            | Background | Usage                |
| --------- | ---------------- | ---------- | -------------------- |
| Primary   | `.btn-primary`   | Gray-900   | Main actions         |
| Accent    | `.btn-accent`    | Blue-600   | Alternative primary  |
| Secondary | `.btn-secondary` | White      | Cancel, back actions |
| Danger    | Style inline     | Red        | Delete actions       |
| Success   | Style inline     | Green      | Edit, update actions |

**Size Requirements (Mobile)**

- Minimum: 44×44px touch target
- Padding: `0.625rem 1rem`

### Input Fields

```html
<input type="text" class="input-field" placeholder="Enter value" />
```

**States:**

- Default: `border: 1px solid --color-gray-200`
- Focus: `border-color: --color-blue-600` + `box-shadow`
- Error: Add red border and error message below

### Cards

```html
<div class="card">
  <h2>Card Title</h2>
  <p>Card content</p>
</div>

<!-- With hover effect -->
<div class="card card-hover">...</div>
```

**Specifications:**

- Background: White
- Border: 1px solid `--color-gray-200`
- Border-radius: `--radius-md` (8px)
- Shadow: `--shadow-sm`
- Padding: `--spacing-lg`

### Sections

```html
<div class="section-container section-blue">
  <h3 class="section-title blue">Section Title</h3>
  <!-- Content -->
</div>
```

Available: `section-blue`, `section-green`, `section-yellow`, `section-purple`, `section-gray`, `section-orange`, `section-teal`

---

## 5. Shadows

| Token         | Usage                   |
| ------------- | ----------------------- |
| `--shadow-sm` | Cards, subtle elevation |
| `--shadow-md` | Dropdowns, popovers     |
| `--shadow-lg` | Modals, dialogs         |

---

## 6. Border Radius

| Token           | Size   | Usage                  |
| --------------- | ------ | ---------------------- |
| `--radius-sm`   | 6px    | Buttons, inputs        |
| `--radius-md`   | 8px    | Cards, sections        |
| `--radius-lg`   | 12px   | Modals, KPI cards      |
| `--radius-full` | 9999px | Avatars, badges, pills |

---

## 7. Z-Index Scale

| Token          | Value | Usage               |
| -------------- | ----- | ------------------- |
| `--z-base`     | 1     | Default elements    |
| `--z-dropdown` | 10    | Dropdowns, popovers |
| `--z-sticky`   | 20    | Sticky headers      |
| `--z-modal`    | 100   | Modals, dialogs     |
| `--z-tooltip`  | 1000  | Tooltips            |

---

## 8. Animations

### Available Animation Classes

```css
/* Page/component transitions */
.animate-fade-in      /* Fade in 0.3s */
/* Fade in 0.3s */
.animate-fade-in-up   /* Fade + slide up 0.4s */

/* Loading states */
.animate-shimmer      /* Gradient shimmer */
.animate-pulse        /* Opacity pulse */

/* Interactive elements */
.btn-ripple           /* Ripple on click */
.btn-hover-scale      /* Scale up on hover */

/* Tables */
.table-row-animate    /* Staggered row animation */

/* Cards */
.card-hover; /* Lift + shadow on hover */
```

### Using Staggered Animations

```jsx
<tr className="table-row-animate" style={{ '--row-index': index }}>
```

---

## 9. Responsive Breakpoints

| Token                  | Size   | Device        |
| ---------------------- | ------ | ------------- |
| `--breakpoint-mobile`  | 480px  | Small phones  |
| `--breakpoint-tablet`  | 768px  | Tablets       |
| `--breakpoint-desktop` | 1024px | Laptops       |
| `--breakpoint-wide`    | 1280px | Large screens |

### Mobile Guidelines

- Touch targets: minimum 44×44px
- Input font-size: 16px (prevents iOS zoom)
- Reduced spacing on mobile
- Stack layouts vertically

---

## 10. Accessibility

### Focus Indicators

```css
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}
```

### Skip Link

Include in Layout for keyboard navigation:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### Required Fields

Use red asterisk for required fields:

```jsx
<label>
  Field Name <span style={{ color: "#EF4444" }}>*</span>
</label>
```

---

## Quick Reference

### Import Order

```css
@import "./styles/tokens.css"; /* Design tokens first */
@import "./App.css"; /* Utility classes */
```

### File Locations

| File            | Purpose                                     |
| --------------- | ------------------------------------------- |
| `tokens.css`    | Design tokens (colors, spacing, typography) |
| `index.css`     | Base styles, utilities, responsive          |
| `App.css`       | Animations, section containers, utilities   |
| `Dashboard.css` | Dashboard-specific styles                   |
