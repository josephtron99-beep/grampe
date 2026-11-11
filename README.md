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
Signed-in wallet app built on the same design system. Open `dashboard/index.html` (locally: http://localhost:5510/dashboard/).
- `index.html` app shell · `dashboard.css` layout · `app.js` router, pages and flows · `data.js` **demo data**
- Pages (hash links): `#/home` `#/wallet` `#/history` `#/send` `#/receive` `#/swap` `#/transfer` `#/upi` `#/cards` `#/staking` `#/gifts` `#/referral` `#/profile` `#/security`
- Mirrors the live grampe.co wallet: 9 assets, 7 networks, swap rule (GCC only from USDT), UPI with OTP, RuPay virtual card, gift cards, profile, password.
- Not connected to the backend: balances, history and fees are fictional and saved in the browser (`localStorage`). Replace `data.js` and the flow handlers in `app.js` with API calls to go live.
- Extras: Ctrl K command palette, hide balances, INR/USD, collapsible sidebar, bottom tab bar + quick-action button on phones.

## Dashboard V2 (`/dashboard/v2`)
Same pages, data and flows as V1 with a completely different look: dark "Night" theme (`data-theme="night"` in `tokens.css`), glass top menu with mega menus, bento home (rolling balance, allocation donut, market sparklines, activity timeline, holographic card), asset-card wallet, intro splash and mesh background. Uses `../data.js` and the shared page patterns in `../dashboard.css`; its own styles are in `v2.css`. Switch between versions from the user menu.

Asset links carry a `?v=` tag; bump it in both dashboard `index.html` files when you release CSS/JS changes so browsers fetch fresh files.

## Dashboard V3 (`/dashboard/v3`)
Multi-page concept in a neutral dark "carbon" theme (`data-theme="carbon"` in `tokens.css`), inspired by crypto-wallet references: glowing page tabs, asset cards with hover sparklines and Deposit/Withdraw/Swap, coloured stat tiles, UPI-limit gauge and portfolio donut.
- Built so far: **Overview** (`index.html`). Exchange, Earn and Activity tabs are marked "Soon" and will become `exchange.html`, `earn.html`, `activity.html`.
- `shell.js` is shared by every V3 page (top bar, page tabs, toasts, helpers as `window.G3`); each page adds its own script (`overview.js`). Styles: `v3.css`.
- Card actions open the matching V1 pages until the V3 pages exist.

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
