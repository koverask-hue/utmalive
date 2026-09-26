import { env, optionalEnv, appUrl } from "./env";

const API = "https://discord.com/api/v10";

export function redirectUri() {
  return `${appUrl()}/api/auth/callback`;
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env("DISCORD_CLIENT_ID"),
    response_type: "code",
    redirect_uri: redirectUri(),
    // guilds.members.read lets us read the user's roles in our server.
    scope: "identify guilds.members.read",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("DISCORD_CLIENT_ID"),
      client_secret: env("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null };
type GuildMember = { nick: string | null; roles: string[] };

export type DiscordIdentity = {
  id: string;
  name: string;
  avatar: string | null;
  isMember: boolean;
  isStreamer: boolean;
};

export async function fetchIdentity(accessToken: string): Promise<DiscordIdentity> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [userRes, memberRes] = await Promise.all([
    fetch(`${API}/users/@me`, { headers }),
    fetch(`${API}/users/@me/guilds/${env("DISCORD_GUILD_ID")}/member`, { headers }),
  ]);
  if (!userRes.ok) throw new Error(`Discord /users/@me failed: ${userRes.status}`);
  const user = (await userRes.json()) as DiscordUser;
  // 404 means the user is not in the server.
  const member = memberRes.ok ? ((await memberRes.json()) as GuildMember) : null;

  const roles = member?.roles ?? [];
  const memberRole = optionalEnv("DISCORD_MEMBER_ROLE_ID");
  const isStreamer = roles.includes(env("DISCORD_STREAMER_ROLE_ID"));
  const isMember = !!member && (!memberRole || roles.includes(memberRole) || isStreamer);

  return {
    id: user.id,
    name: member?.nick ?? user.global_name ?? user.username,
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null,
    isMember,
    isStreamer,
  };
}
