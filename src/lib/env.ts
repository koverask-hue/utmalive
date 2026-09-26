// Read lazily so `next build` works before every secret is configured.
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function appUrl(): string {
  return (optionalEnv("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}
