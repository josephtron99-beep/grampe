# Grampe — Home page redesign

Static redesign of the grampe.co home page. Plain HTML, CSS and JS with no build step.

## Files
```
index.html                 Home page
design-system.html         Living reference of all tokens + components (noindex)
assets/css/tokens.css      Design tokens: colour, type, spacing, radius, shadow, motion
assets/css/components.css  Shared components + site header/footer (every page)
assets/css/home.css        Home page sections only (built from tokens + components)
assets/js/main.js     Interactions: menu, nav indicator, tilt, toasts, travel tabs/swap, converter, live gccscan stats, points, reveal animations
assets/img/            Brand assets from grampe.co (logo.png, shield.svg, card_active.png, stays/*.jpg) + icons.svg sprite
vercel.json           Security + cache headers
.claude/skills/       Role skills (designer, UI/UX, writer, researcher, PM, frontend, backend)
```

## Run locally
```
python -m http.server 5510
```
Open http://localhost:5510

## Deploy (GitHub + Vercel)
1. Push this folder to a GitHub repo.
2. In Vercel: New Project, import the repo, Framework preset **Other**, no build command, output directory = root.
3. Deploy.

## Dashboard (`/dashboard`)
Signed-in wallet app. **The folder is self-contained**: copy `dashboard/` anywhere (or deploy it on its own) and it works with no other files.
```
dashboard/
  index.html            app shell (sidebar, header, overlays)
  css/tokens.css        design tokens (copy of assets/css/tokens.css)
  css/components.css    shared components (copy of assets/css/components.css)
  css/dashboard.css     dashboard layout + page patterns
  css/ui.css            shadcn/ui-style component layer (Grampe colours only)
  js/data.js            demo data
  js/app.js             router, pages and flows
  img/                  logo, favicon, shield, icons.svg sprite
```
- Pages (hash links): `#/home` `#/wallet` `#/history` `#/send` `#/receive` `#/swap` `#/transfer` `#/upi` `#/cards` `#/staking` `#/gifts` `#/referral` `#/profile` `#/security`
- Sidebar: Menu (Home, Wallet) and Products (Swap, RuPay card, Transfer, Refer), Need help (Telegram), Log out. Content is centred at 800px max.
- Every list has search and filters. Not connected to the backend: balances, history and referrals are demo data saved in the browser (`localStorage`). Replace `js/data.js` and the flow handlers in `js/app.js` with API calls to go live.
- `css/tokens.css` and `css/components.css` are copies; if you change the site's versions, copy them here again.
- Asset links in `dashboard/index.html` carry a `?v=` tag; bump it when you release CSS/JS changes.

## Design system
Every page loads `tokens.css` → `components.css` → its own page file (e.g. `home.css`).
- No hex colours or one-off pixel sizes in components or page files; use tokens.
- Components: button, badge, chip, link, icon tile, icon button, coin, avatar, card, tile, field, segmented control, check list, live dot, section head.
- Open `design-system.html` to see every token and component before building a new page.

## Notes
- Login, Create Account and Forgot password link to the live backend at https://www.grampe.co (ASP.NET).
- Services, GINR, Airdrop and Download links are relative (`services.html` …) and will 404 until those pages are built.
- GINR total supply and holders load live from the gccscan API; the HTML keeps fallback values.
- The live site has no Privacy Policy or Terms pages. Add them before launch.
