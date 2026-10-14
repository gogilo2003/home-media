---
name: ui-ux
description: Reference the repo UI/UX design guide. Use when implementing or updating the frontend UI, styling, or UX behavior.
---

# UI/UX Design Guide

The repository includes the design reference at `docs/ui-ux.svg` (and related design docs under `docs/`). This SVG captures the intended look and feel for the HomeMedia-style UI (dark theme, card grid, categories, search, player view).

When adapting or updating the web UI (`public/index.html`, `public/app.js`, `src/input.css`, `tailwind.config.js`), align with the design system shown in the SVG:
- Dark background gradient (`#0B0E14` → `#121721`)
- Accent gradient (`#6366F1` → `#4F46E5`) for active elements/brand
- Card styles with subtle borders and hover states
- Clear category tabs (Movies/Series/Music) and "LOCAL" badge
- Clean, minimal layout with proper spacing

Do not add new runtime dependencies for UI. Tailwind CSS is used via CLI (`npm run css` / `npm run css:build`). Keep changes to existing files unless explicitly required and aligned with constraints.
