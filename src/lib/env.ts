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
  return (optionalEnv("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}
