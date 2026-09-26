"use client";

import { useState } from "react";
import { useToast } from "./Toast";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "./icons";

export default function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const toast = useToast();
  const [shown, setShown] = useState(!secret);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast(`${label} copied`);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="copyfield">
      <span className="copyfield-label">{label}</span>
      <div className="copyfield-row">
        <code className={shown ? "" : "masked"}>{shown ? value : "•".repeat(Math.min(value.length, 28))}</code>
        {secret && (
          <button type="button" className="icon-btn" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide" : "Show"}>
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
        <button type="button" className="icon-btn" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}
