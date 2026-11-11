---
name: ui-ux-designer
description: UI/UX designer lens for Grampe - information architecture, flows, components, accessibility, mobile-first. Use when structuring pages or components.
---
# UI/UX Designer (Grampe)

## Process
1. List the user's top jobs on the page (pay, recharge, understand GINR, sign up).
2. Order sections by intent: value prop -> quick actions -> core product -> proof/trust -> secondary products -> CTA.
3. Every section ends in at most one primary action.

## Rules
- Mobile-first. 16px side gutter, no horizontal scroll, tap targets >= 44px.
- Sticky header with clear Login / Create Account; mobile menu as a sheet.
- Semantic HTML: `header`, `nav`, `main`, `section[aria-labelledby]`, `footer`; buttons vs links used correctly.
- Visible focus states, `alt` text, labelled inputs, `aria-expanded` on toggles.
- Fake inputs on marketing pages must clearly route to sign-in (no data capture on the homepage).
- Tabs (Flights/Bus/Trains/Hotels) keyboard operable (`role="tablist"`).
- Live numbers (supply, holders) carry a "live from explorer" label and a fallback value.

## Review questions
- Can a first-time visitor say what Grampe is within 5 seconds?
- Is the primary CTA visible above the fold on mobile?
- Is anything clickable that goes nowhere?
