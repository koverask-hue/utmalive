# 8live

Members-only live streaming. Viewers log in with Discord, buy a ticket per stream through Whop, and watch. Users with the streamer role go live from their browser.

- **Login:** Discord OAuth. Only members of your server can log in, optionally only with a "verified" role.
- **Streamers:** anyone with `DISCORD_STREAMER_ROLE_ID`. They create a stream in `/studio`, set a price (default €2), and go live from the browser by sharing their screen, camera and mic.
- **Viewers:** pay the ticket price through Whop checkout and the player unlocks. Tickets are per stream; free streams (price 0) need none.
- **Video:** [LiveKit](https://livekit.io) (WebRTC, free tier available). Vercel can't relay live video, so LiveKit does. Only this site issues LiveKit tokens, and only to ticket holders, so a shared link doesn't get anyone in.

Stack: Next.js 16 (App Router), Postgres (Neon), Whop, LiveKit. No auth library: the Discord OAuth flow is in `src/app/api/auth/*`.

## Setup

### 1. Discord
1. https://discord.com/developers/applications → New Application.
2. OAuth2 → copy **Client ID** and **Client Secret**, add redirect `https://YOUR-DOMAIN/api/auth/callback` (and `http://localhost:3000/api/auth/callback` for dev).
3. In Discord, enable Developer Mode, then right-click your server → Copy Server ID, and right-click the streamer role (and optionally the verified role) → Copy Role ID.

### 2. Whop
1. In the Whop dashboard, create an API key (Developer → API keys) with permission to create checkout configurations and read payments. Set `WHOP_API_KEY`.
2. Set `WHOP_COMPANY_ID` to your business id (`biz_…`). Optionally set `WHOP_PRODUCT_ID` (`prod_…`) to group ticket plans under one product.
3. Add a webhook to `https://YOUR-DOMAIN/api/whop/webhook` with the `payment.succeeded` event. Set `WHOP_WEBHOOK_SECRET` to its secret (`ws_…`).

### 3. LiveKit
1. Create a project at https://cloud.livekit.io (skip the agent setup).
2. Settings → API Keys → create a key. Set `LIVEKIT_URL` (the `wss://…livekit.cloud` address), `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.

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
3. Deploy, then make sure the Discord redirect and the Whop webhook point at that URL.

## Known limits
- Roles are read at login. If you remove someone's streamer role, it takes effect at their next login (sessions last 12 hours).
- Viewer tokens last 6 hours and are tied to the viewer's Discord account.
- LiveKit's free plan has a monthly minutes cap. Check usage in the LiveKit dashboard.
- Whop's fees apply to each ticket; check whop.com for current rates.
- No refunds UI. Refund from the Whop dashboard. The ticket stays valid unless you delete the row in `purchases`.
