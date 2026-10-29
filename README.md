# Cris — Early Access / Waitlist

Responsive SaaS marketing landing page + secure waitlist API, implemented in **JavaScript/JSX and Python only**. No TypeScript files. Inspired by the supplied Cris product flyer and architecture.

## Included

- Next.js App Router + Tailwind CSS, five feature cards, three target-industry cards, responsive hero, smooth-scrolling sticky header, how-it-works, SEO metadata.
- React Hook Form and Zod form: name, work email, company, industry, optional title, company size, optional message; loading/success/error states.
- FastAPI/Pydantic + MongoDB Atlas `waitlist` collection with unique email index, `created_at`, `source: landing_page`.
- Input allowlisting, honeypot, restricted CORS, API rate limit of five submissions per IP per hour.
- `Request a Demo` opens a pre-addressed email (change `NEXT_PUBLIC_DEMO_EMAIL`).
- Initial draft Privacy/Terms pages: **replace with reviewed policies before publishing**.

## Requirements

- Node.js 20.9+ and npm (Node.js 22 recommended)
- Python 3.11+ and MongoDB Atlas with an allowed IP/network path

## 1 — Configure MongoDB Atlas

Create a cluster/database user with write privileges restricted to your database and allow networking from your backend host. Copy the Atlas connection string into `backend/.env`. Never put Atlas credentials in a frontend environment variable.

## 2 — Run backend (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with your Atlas connection string and correct ALLOWED_ORIGINS
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`, then the same pip/uvicorn commands.

## 3 — Run frontend (in another terminal)

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. To run a production frontend build: `npm run build && npm run start`.

## 4 — Deploy

1. Push the root folder to GitHub. In AWS Amplify, connect the repository and set the **app root** to `frontend` (or use the included monorepo `amplify.yml` from repository root). Enable the appropriate Amplify Next.js SSR/compute hosting capability.
2. Set `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com` and `NEXT_PUBLIC_DEMO_EMAIL=your-real-contact@yourdomain.com` as frontend environment variables. Rebuild after changing `NEXT_PUBLIC_` values.
3. Deploy `backend/` separately to App Runner/ECS (or another compatible Python hosting service). Provide `MONGODB_URI`, `MONGODB_DB`, `ALLOWED_ORIGINS=https://waitlist.yourdomain.com`, and a durable Redis rate-limit backend when using multiple instances. Use AWS Secrets Manager or host secret settings; never commit `.env`.
4. Set up HTTPS, correct frontend/backend custom domains, network access to Atlas, and a suitable health check (`/health`).
5. Test the real waitlist request, duplicate signup, rate limit, and mobile layout against the deployed API before publishing.
6. Deploy privacy/terms policies and update your public demo contact address. Configure SES or Resend later when you add actual email notifications; there is currently **no email-sending side effect**, so you do not need either provider yet.

## Security / production notes

- Rate limiter uses `memory://` for local single-process development. Multi-process or multi-instance hosting MUST configure shared Redis using `REDIS_URL`, and your ingress should apply additional WAF/bot limits.
- The limiter uses `request.client.host`. Behind a reverse proxy, configure Uvicorn `--proxy-headers --forwarded-allow-ips=<TRUSTED_PROXY_IPS>` (the actual ingress IP range), and ensure your proxy **removes untrusted client-supplied forwarded headers**. Never trust arbitrary `X-Forwarded-For` headers. Incorrect configuration means many users may share one rate limit or may spoof addresses.
- Email uniqueness is case-insensitive because it is normalized lowercase. The API deliberately returns the same success message for existing addresses to avoid enumeration.
- The fields use restrictive plain-text validation. Consider loosening patterns to accept legitimate organization names or punctuation if needed while continuing to reject markup. Never put untrusted input into HTML or raw database operators.
- The honeypot is not a substitute for CAPTCHA, WAF, or abuse monitoring; add a challenge if spam becomes significant.
- The form requests a 'work email' but does not block personal-email domains. If business-only email is mandatory, define a clear policy and add server-side enforcement.
- `GET /health` confirms the API process is responding, **not** Atlas connectivity; monitor DB readiness separately.
- The waitlist is not itself a background-check service. Avoid advertising regulatory compliance certifications until formally verified. Obtain legal/privacy review before launch.
- Before launch: review retention and deletion procedures, consent and email marketing requirements, secure admin access, backups, indexes, cloud monitoring, accessibility and test coverage.

## Source structure

```
cris-waitlist/
├── frontend/
│   ├── app/ (page.js, layout.js, globals.css, privacy/, terms/)
│   ├── components/ (Brand.js, WaitlistForm.js)
│   ├── public/images/cris-product.png
│   ├── .env.example, package.json, tailwind.config.js, postcss.config.js
│   └── jsconfig.json, next.config.js
├── backend/
│   ├── main.py, requirements.txt, .env.example
├── amplify.yml
└── README.md
```
