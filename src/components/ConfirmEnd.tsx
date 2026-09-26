"use client";

import { useRef } from "react";
import SubmitButton from "./SubmitButton";

export default function ConfirmEnd({ id, title, action }: { id: string; title: string; action: (f: FormData) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="btn danger-ghost" onClick={() => dialog.current?.showModal()}>
        End stream
      </button>
      <dialog ref={dialog} className="modal" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <h3>End “{title}”?</h3>
        <p className="muted">
          Viewers are disconnected and OBS can&apos;t reconnect to this key. Ticket holders keep their tickets, but the stream
          can&apos;t be restarted.
        </p>
        <form action={action} className="modal-actions">
          <input type="hidden" name="id" value={id} />
          <button type="button" className="btn ghost" onClick={() => dialog.current?.close()}>
            Keep streaming
          </button>
          <SubmitButton className="btn danger" pending="Ending…">
            End stream
          </SubmitButton>
        </form>
      </dialog>
    </>
  );
}
