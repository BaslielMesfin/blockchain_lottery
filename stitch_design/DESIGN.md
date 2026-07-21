---
name: Ticket-Core
colors:
  surface: '#070053'
  surface-dim: '#070053'
  surface-bright: '#2006bd'
  surface-container-lowest: '#050044'
  surface-container-low: '#0c006a'
  surface-container: '#0f0076'
  surface-container-high: '#150094'
  surface-container-highest: '#1c00b3'
  on-surface: '#e2dfff'
  on-surface-variant: '#c3caac'
  inverse-surface: '#e2dfff'
  inverse-on-surface: '#1900a7'
  outline: '#8d9479'
  outline-variant: '#434933'
  surface-tint: '#a1d800'
  primary: '#ffffff'
  on-primary: '#263500'
  primary-container: '#b8f600'
  on-primary-container: '#506e00'
  inverse-primary: '#4b6700'
  secondary: '#ffffff'
  on-secondary: '#003737'
  secondary-container: '#00fbfb'
  on-secondary-container: '#007070'
  tertiary: '#ffffff'
  on-tertiary: '#4e2600'
  tertiary-container: '#ffdcc4'
  on-tertiary-container: '#9a5100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b8f600'
  primary-fixed-dim: '#a1d800'
  on-primary-fixed: '#141f00'
  on-primary-fixed-variant: '#384e00'
  secondary-fixed: '#00fbfb'
  secondary-fixed-dim: '#00dddd'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f4f'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb77f'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6f3900'
  background: '#070053'
  on-background: '#e2dfff'
  surface-variant: '#1c00b3'
  void-black: '#0A0A1A'
  surface-indigo: '#1E1A7D'
  ticket-white: '#F8F8FF'
  success-green: '#BFFF00'
  warning-orange: '#FF8A00'
  info-cyan: '#00FFFF'
typography:
  display-jackpot:
    fontFamily: Anton
    fontSize: 84px
    fontWeight: '400'
    lineHeight: 84px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 40px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-bold:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
  ticket-id:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 14px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  ticket-padding: 32px
---

## Brand & Style

The design system is engineered to evoke the high-stakes adrenaline of a physical lottery while maintaining the sleek, technical precision of Web3. It moves away from the sterile "SaaS dashboard" aesthetic in favor of a **Tactile High-Contrast** style that treats UI elements as tangible, digital assets.

The brand personality is **Bold, Energetic, and Provocatively Transparent**. It targets a crypto-native audience that values both the fun of gamified finance and the uncompromising clarity of on-chain data. The visual narrative is built around "The Ticket"—a physical metaphor for entry into the Ethereum ecosystem. Every interaction should feel like handling a premium, limited-edition pass, using literal motifs like perforated edges, circular notches, and decorative barcodes to ground the abstract nature of smart contracts in something familiar and valuable.

## Colors

The palette is anchored by **"Void Black"** and **"Neutral Indigo,"** creating a deep, saturated canvas that allows neon accents to vibrate with intensity. 

- **Primary (Lime Green):** Used for "Buy" actions, active timer states, and winning outcomes. It represents growth and liquidity.
- **Secondary (Cyan):** Used for wallet connectivity, secondary data points, and decorative ticket notches.
- **Tertiary (Orange):** Reserved for urgency—countdown warnings, high-value jackpots, and administrative "Restart" functions.
- **Surface Strategy:** Backgrounds use deep indigo gradients to create depth, while "Ticket-White" is used sparingly for high-contrast text and barcode areas to mimic physical paper.

## Typography

Typography is a mix of high-impact display faces and technical monospace details.

- **Headlines:** Use **Anton** for its aggressive, condensed, and authoritative presence. It is ideal for the "Jackpot" and "Timer" where numbers need to feel massive and urgent.
- **Body:** **Hanken Grotesk** provides a clean, high-contrast sans-serif counterpoint to the headlines, ensuring readability for transaction details and wallet addresses.
- **Data/Labels:** **JetBrains Mono** is used for all technical data, contract addresses, and the "barcode" style labels to reinforce the developer-centric nature of Ethereum. 

Use `text-transform: uppercase` on all headlines and labels to maintain the "Ticket-Stub" aesthetic.

## Layout & Spacing

The layout follows a **Fixed Grid** system that centers the primary "Ticket Card" on the screen, mimicking a physical asset presented to the user.

- **The Main Stage:** Content is contained within a 12-column grid on desktop (max-width 1200px), but the primary interaction happens within "Ticket Modules" that occupy the central 6-8 columns.
- **Perforation Logic:** Vertical spacing between cards should be separated by a 2px dashed "perforation" line using the neutral indigo color.
- **Mobile Reflow:** On mobile, tickets stack vertically. The horizontal notches at the card edges should remain visible, slightly breaking the screen margin to imply the ticket extends beyond the viewport.

## Elevation & Depth

This design system avoids traditional soft shadows. Depth is instead achieved through **Tonal Layering** and **Edge Cutouts**:

- **Layer 0:** The deepest background uses a radial gradient from `#3B33D1` to `#0A0A1A`.
- **Layer 1 (The Ticket):** The main container uses a flat `#F8F8FF` (Ticket White) or a slightly lighter indigo.
- **Depth Motifs:** Use `clip-path` to create circular "notches" (16px radius) at the midpoints of card edges, creating a physical "punched out" look.
- **Inner Glows:** Instead of drop shadows, use 1px solid borders in Neon Lime or Cyan with a subtle outer glow (blur: 10px) to indicate "Live" or "Active" tickets.

## Shapes

The shape language is strictly **Sharp (0px roundedness)** to emphasize the "cut" nature of paper tickets. 

Visual interest is created through **Geometry rather than Rounding**:
- **Notches:** Half-circle cutouts on the sides of cards.
- **Angled Corners:** Use 45-degree chamfered corners for "Admin" buttons to distinguish them from "User" buttons.
- **Dashed Lines:** All dividers must be dashed (2px dash, 4px gap) to simulate tear-off strips.

## Components

### The Ticket Card
The core container. It features a "Main Body" and a "Stub." The Stub (usually 25% of the height or width) is separated by a dashed perforation line and contains the secondary information like "Ticket Price" or "Recent Winner."

### Buttons (The "Claim" Style)
Buttons are rectangular with no border radius. 
- **Primary:** Neon Lime background with black text. On hover, it gains a 4px black "offset" shadow to look 3D.
- **Secondary:** Transparent background with a 2px Cyan border.

### Input Fields
Inputs should look like "data entry" fields on a form. Thick bottom borders (2px) in Cyan, with the label floating in the top left in JetBrains Mono.

### Decorative Barcode
Every ticket should include a non-functional decorative barcode (composed of varying widths of vertical black rectangles) at the bottom of the stub. This reinforces the "high-fidelity physical asset" aesthetic.

### Status Badges
"LIVE" and "ENDED" badges should use a "Stamp" aesthetic—thick borders, rotated 5 degrees, using bold Anton typography.