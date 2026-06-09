# Architect AI - Mobile Portfolio Design Specification

This specification defines the light-themed, minimal mobile chat interface styled like ChatGPT and Gemini.

## Brand & Aesthetic
- **Theme**: Minimal Light Mode. Clean, white backgrounds with high contrast dark charcoal text.
- **Colors**:
  - Background: `#ffffff` (Absolute white) / `#f9fafb` (Soft container background)
  - Text: `#1f2937` (Dark grey charcoal)
  - Accents: `#111827` (Black/Near black for buttons)
  - Borders/Lines: `#e5e7eb` (Light grey)
  - Shadow: `0 4px 20px rgba(0, 0, 0, 0.06)` (Soft, clean shadow)
- **Typography**:
  - Font Family: Geist Sans or Inter (clean geometric sans-serif)
  - Header: 14px bold name, 12px light role
  - Hero Welcome: Large bold "Hi!" (32px), readable body text (16px)

## Layout & Structure
1. **Header**:
   - Hamburger icon on the left.
   - Profile section in two columns:
     - Left column: Circular profile avatar (`images/sayantan_pic.png`).
     - Right column: Name (`Sayantan Ghosh` on top) and role (`Product Thinker & UX Strategist` below).
2. **Screen 1 (Landing View)**:
   - **Middle Aligned Content**:
     - Large welcome intro text centered.
     - Text Box (Chat Input) placed just after welcome text with a gap.
     - Rounded corner textbox (`border-radius: 24px`) with a soft grey shadow.
     - Input field controls:
       - Top: Text input area ("Ask me anything about me").
       - Bottom Left: Circular download button (for CV and Case Studies).
       - Bottom Right: Mic icon and Send icon side-by-side.
     - Partner Logos Grid at the bottom:
       - RummyCircle on top middle.
       - "Worked through tenXengage" followed by Google & Cisco.
       - "Worked through tenXengage" followed by National Geographic & Hurix Digital (replacing Blue Dart).
3. **Screen 2 (Chat View)**:
   - Header remains at the top.
   - Chat input box transitions smoothly to the bottom.
   - Chat history scroll area occupies the middle area above the input box.

## Transition Effect
- Smooth fade and translation animations.
- When the first message is submitted, the welcome text and partner logos fade out, and the text input box moves to the bottom of the screen.
