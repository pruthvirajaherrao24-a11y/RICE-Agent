---
name: Tactile Precision Dark
description: A sophisticated dark neumorphic design system characterized by soft 3D depth, tactile surfaces, and a professional charcoal palette.
---

# Tactile Precision Dark

## Visual Principles

### 1. Depth & Elevation
The hallmark of this system is the use of dual-layered shadows to create the illusion of physical depth.
- **Raised Elements**: Use a combination of a light top-left shadow and a dark bottom-right shadow to "extrude" the surface.
- **Sunken Elements**: Use inset shadows (top-left dark, bottom-right light) to "press" elements into the surface.
- **Minimalism**: Depth is the primary decorative element. Avoid unnecessary borders, gradients, or ornaments.

### 2. Palette
The palette is centered around a neutral, deep charcoal to provide enough contrast for both light and dark shadow offsets.

| Token | Value | Role |
| :--- | :--- | :--- |
| `surface` | #1a1c1e | The base plane for all elements. |
| `surface-container` | #1a1c1e | Matching the background to maintain the "one-piece" look. |
| `on-surface` | #e2e2e6 | Primary text and labels. |
| `on-surface-variant` | #c4c7cc | Secondary text and disabled states. |
| `primary` | #ffffffdc | High-contrast accent for interactive states (Emerald). |

### 3. Shadow Specs (The "3D" Look)
To achieve the look seen in the reference material:

**Light Offset (Top-Left):**
- Color: rgba(255, 255, 255, 0.05)
- Blur: 10px to 15px
- Offset: -5px -5px

**Dark Offset (Bottom-Right):**
- Color: rgba(0, 0, 0, 0.5)
- Blur: 15px to 20px
- Offset: 5px 5px

## Component Patterns

### Buttons
- **Default State**: Slightly raised (Extruded).
- **Active/Pressed State**: Sunken (Inset). This provides immediate tactile feedback.
- **Shape**: `ROUND_EIGHT` (8px radius) or full pill-shape for inputs.

### Input Fields
- **Container**: Always sunken (Inset) to suggest a cavity for data entry.
- **Typography**: Manrope, font-weight 400, tracking-normal.

### Layout & Spacing
- **Grid**: 8px base unit.
- **Margins**: Generous whitespace (32px+) to allow shadows room to breathe without overlapping.
