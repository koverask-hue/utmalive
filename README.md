# UTMA Live

Members-only live streaming. Viewers log in with Discord, buy a ticket per stream with Stripe, and watch. Users with the streamer role go live from OBS.

- **Login:** Discord OAuth. Only members of your server can log in, optionally only with a "verified" role.
- **Streamers:** anyone with `DISCORD_STREAMER_ROLE_ID`. They create a stream in `/studio`, set a price (default €2), and paste the server URL and key into OBS.
- **Viewers:** pay the ticket price through Stripe Checkout and the player unlocks. Tickets are per stream.
- **Video:** [Mux](https://mux.com) Live. Vercel can't ingest or relay live video, so Mux handles it. Playback is **signed**, so a leaked playback ID won't play without a token issued to a ticket holder.

Stack: Next.js 16 (App Router), Postgres (Neon), Stripe, Mux. No auth library: the Discord OAuth flow is in `src/app/api/auth/*`.

## Setup

### 1. Discord
1. https://discord.com/developers/applications → New Application.
2. OAuth2 → copy **Client ID** and **Client Secret**, add redirect `https://YOUR-DOMAIN/api/auth/callback` (and `http://localhost:3000/api/auth/callback` for dev).
3. In Discord, enable Developer Mode, then right-click your server → Copy Server ID, and right-click the streamer role (and optionally the verified role) → Copy Role ID.

### 2. Stripe
1. Copy the secret key from https://dashboard.stripe.com/apikeys (use `sk_test_…` until you're ready).
2. Developers → Webhooks → Add endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret.

### 3. Mux
1. Settings → Access Tokens → new token with **Mux Video** read + write.
2. Settings → Signing Keys → new key. Copy the key ID and the base64 private key.

### 4. Database
Create a Postgres database. On Vercel: Storage → Marketplace → Neon, which sets `DATABASE_URL`. Then apply the schema once:

```bash
node --env-file=.env.local scripts/migrate.mjs
```

### 5. Run locally
```bash
cp .env.example .env.local   # fill it in
npm install
npm run dev
```

## Deploy to Vercel
1. Import this repo at https://vercel.com/new (framework: Next.js, no config needed).
2. Add every variable from `.env.example` under Settings → Environment Variables. Set `APP_URL` to your production URL.
3. Deploy, then make sure the Discord redirect and the Stripe webhook point at that URL.

## Known limits
- Roles are read at login. If you remove someone's streamer role, it takes effect at their next login (sessions last 12 hours).
- Playback tokens last 4 hours. A paying viewer could share the tokenized URL during that window.
- Stripe fees on a €2 ticket (EEA cards: about €0.25 + 1.5%) take roughly 14%.
- No refunds UI. Issue refunds from the Stripe dashboard. The ticket stays valid unless you delete the row in `purchases`.
