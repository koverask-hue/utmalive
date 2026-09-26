import { price } from "@/lib/format";

// The gold ticket stub: the one loud object on the site. Main body on the left,
// a torn-off stub on the right joined by a perforated edge.
export default function Ticket({
  title,
  streamer,
  priceCents,
  serial,
  owned,
  children,
}: {
  title: string;
  streamer: string;
  priceCents: number;
  serial: string;
  owned?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`ticket ${owned ? "owned" : ""}`}>
      <div className="ticket-main">
        <span className="ticket-kicker">{owned ? "Your ticket" : "Admit one"}</span>
        <h2 className="ticket-title">{title}</h2>
        <p className="ticket-by">Live with {streamer}</p>
        {children && <div className="ticket-action">{children}</div>}
      </div>
      <div className="ticket-stub" aria-hidden>
        <span className="ticket-price">{price(priceCents)}</span>
        <span className="ticket-serial">No. {serial}</span>
      </div>
    </div>
  );
}
