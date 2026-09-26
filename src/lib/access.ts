import { getSession, type Session } from "./session";
import { getStream, hasTicket, type Stream } from "./db";

// For API routes: the viewer plus the stream, only if they may watch it.
export async function streamAccess(streamId: string): Promise<{ session: Session; stream: Stream } | null> {
  const session = await getSession();
  if (!session) return null;
  const stream = await getStream(streamId);
  if (!stream) return null;
  const free = stream.price_cents === 0;
  if (!free && stream.streamer_id !== session.id && !(await hasTicket(stream.id, session.id))) return null;
  return { session, stream };
}
