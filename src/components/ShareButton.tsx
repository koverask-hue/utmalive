"use client";

import { useToast } from "./Toast";
import { ShareIcon } from "./icons";

export default function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    }
  }
  return (
    <button type="button" className="btn ghost" onClick={share}>
      <ShareIcon /> Share
    </button>
  );
}
