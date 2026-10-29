# Cris Waitlist — Single Next.js JavaScript application

A Next.js 15 App Router monolith. **No TypeScript, no FastAPI, no App Runner.**
Preserves the Cris design, images, form, and favicon from the original project.

## Folder structure

```
src/
  app/
    api/waitlist/route.js       # Node.js server-side POST handler
    page.js                     # Cris landing page
    layout.js                   # SEO + favicon
    globals.css
    privacy/page.js
    terms/page.js
  components/
    Brand.js
    WaitlistForm.js
  lib/
    mongodb.js                  # Server-only MongoDB connection
    validation.js               # Shared server validation
public/images/cris-product.png
scripts/setup-indexes.mjs
amplify.yml
```

## Windows local setup

1. Open the project folder in VS Code.
2. `npm install`
3. Copy `.env.example` to `.env.local` and replace placeholder values. **Rotate any MongoDB password previously shared in a screenshot.**
4. Generate a random key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set `RATE_LIMIT_SECRET`.
5. Create indexes (PowerShell):
   ```powershell
   $env:MONGODB_URI = 'mongodb+srv://...'
   $env:MONGODB_DB = 'cris_waitlist'
   node scripts/setup-indexes.mjs
   Remove-Item Env:MONGODB_URI
   Remove-Item Env:MONGODB_DB
   ```
6. `npm run dev` and visit http://localhost:3000.

The browser now sends `POST /api/waitlist` to the **same domain**; no CORS or separate backend URL needed.

## AWS Amplify Hosting deployment

1. Push **the files in this project folder** to the root of your repository's `master` branch.
2. In Amplify connect that branch. **Uncheck 'My app is a monorepo'** when this folder is the Git repository root. If committed within a subdirectory, use the actual subdirectory as app root and adapt the build configuration.
3. Keep the supplied `amplify.yml` at the repository root, with artifacts `.next`. Deploy using **Next.js SSR / Web Compute**, not a static export.
4. Set `MONGODB_DB`, `RATE_LIMIT_SECRET`, and `MONGODB_URI` using secure environment handling. **Use AWS Secrets Manager for the MongoDB credential** where supported; avoid exposing it in build logs or Git. Amplify SSR server-side runtimes must actually receive these values: check your Amplify region/runtime documentation.
5. If your Amplify SSR app requires explicit environment injection, append ONLY the required server-side variables to `.env.production` during build, never echo their values into logs. See AWS Amplify Next.js environment-variable docs. An example build step (for values populated from protected build variables):
   ```sh
   printf 'MONGODB_URI=%s\nMONGODB_DB=%s\nRATE_LIMIT_SECRET=%s\n' "$MONGODB_URI" "$MONGODB_DB" "$RATE_LIMIT_SECRET" >> .env.production
   ```
   **This places secrets in build artifacts; limit build/deployment access, use platform-supported runtime secrets where possible.** Do not use NEXT_PUBLIC_ prefix for secrets.
6. Ensure MongoDB Atlas allows connections from the Amplify compute environment. SSR instances may use changing outbound IPs. Prefer a controlled outbound networking solution or additional Atlas authentication controls; an unrestricted Atlas IP allowlist is a security compromise, not a recommended default.
7. Deploy and verify `/api/waitlist` from the same public hostname, submit a test registration, and inspect MongoDB.

### Security considerations

- Zod validates submitted JSON on server and client; HTML-like content is rejected.
- DB collection `waitlist` stores `created_at` and `source`.
- Idempotent outward response for repeated email; create a **unique `email` index** using the script before launch.
- Rate limiting uses shared MongoDB hourly counters; default keys are based on user-agent if trusted source IP isn't available. This is **not a complete bot protection solution**. Add AWS WAF, managed challenge/CAPTCHA, and abuse monitoring for public exposure. Do not enable trust in forwarded IP unless your trusted proxy overwrites user-supplied headers.
- Keep `MONGODB_URI` and `RATE_LIMIT_SECRET` server-only; do not commit `.env.local`.
- No email sending is enabled; optional SES/Resend is a later phase.
- Privacy/Terms pages are templates and should be reviewed before public use.
- Amplify SSR incurs request/compute charges, but avoids an independent always-on App Runner service. Monitor your AWS Billing console and configure a budget alert.

## End-to-end checks

- `npm install`, `npm run build`, `npm run dev`
- Visit homepage, verify favicon/images and links.
- POST a valid test form; check for HTTP 201 and MongoDB record.
- Post same email; expect success-style message but no second record.
- Invalid form should fail validation.
- API must run on the Node.js runtime, not static export/Edge.
