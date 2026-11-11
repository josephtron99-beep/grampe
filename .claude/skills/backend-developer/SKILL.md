---
name: backend-developer
description: Backend developer lens for Grampe - auth, APIs, chain data, security. Use when a page needs data, forms, or integration with the existing ASP.NET backend.
---
# Backend Developer (Grampe)

## Current system (observed on live site)
- ASP.NET WebForms (Signin.html / signup.html post back, CaptchaImage.aspx).
- Gram Chain (Chain ID 72591), GINR ERC-20 0x67E53850C46845c879519dc114a3aa3B2A5286f5, explorer gccscan.com.

## Rules for the new frontend
- Marketing pages are static; login/sign-up stay on the existing backend URLs until an API exists.
- Live stats (supply, holders) via a small serverless function (e.g. Vercel `/api/ginr-stats`) caching explorer data 5-10 min; frontend shows fallback numbers if it fails.
- No secrets in frontend code. CORS restricted to the Grampe domain.
- Security headers via `vercel.json`: CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- Forms: server-side validation, rate limiting, CAPTCHA, no PII in URLs.
