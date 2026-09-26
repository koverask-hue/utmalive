-- Streams created by users with the streamer role.
CREATE TABLE IF NOT EXISTS streams (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  streamer_id         TEXT NOT NULL,          -- Discord user id
  streamer_name       TEXT NOT NULL,
  streamer_avatar     TEXT,
  price_cents         INTEGER NOT NULL CHECK (price_cents >= 50),
  mux_live_stream_id  TEXT NOT NULL,
  mux_playback_id     TEXT NOT NULL,
  ended_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per successful Stripe Checkout session (a ticket for one stream).
CREATE TABLE IF NOT EXISTS purchases (
  stripe_session_id   TEXT PRIMARY KEY,
  stream_id           TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  discord_id          TEXT NOT NULL,
  amount_cents        INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_stream_user ON purchases (stream_id, discord_id);

-- Upgrades for databases created before these columns existed.
ALTER TABLE streams ADD COLUMN IF NOT EXISTS streamer_avatar TEXT;
