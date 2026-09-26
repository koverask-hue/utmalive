"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

// After returning from checkout: confirm the ticket once, then clean the URL.
export default function TicketWelcome({ streamId }: { streamId: string }) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    toast("Ticket confirmed. Enjoy the stream.", "gold");
    router.replace(`/streams/${streamId}`, { scroll: false });
  }, [toast, router, streamId]);
  return null;
}
