"use client";

import SubmitButton from "./SubmitButton";

export default function DeleteStream({ id, title, action }: { id: string; title: string; action: (f: FormData) => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete “${title}”? Its tickets and chat are deleted too. This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn danger-ghost small" pending="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}
