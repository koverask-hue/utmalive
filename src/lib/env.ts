// Read lazily so `next build` works before every secret is configured.
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// First non-empty of several names, e.g. when a Vercel integration used a custom prefix.
export function envAny(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing environment variable ${names.join(" or ")}`);
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function appUrl(): string {
  const explicit = optionalEnv("APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  // Set automatically by Vercel, so production works even without APP_URL.
  const vercel = optionalEnv("VERCEL_PROJECT_PRODUCTION_URL");
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
