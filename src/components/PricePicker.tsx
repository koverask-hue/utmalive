"use client";

import { useState } from "react";
import Ticket from "./Ticket";

const PRESETS = [2, 3, 5, 10];

export default function PricePicker({ defaultPrice, streamer }: { defaultPrice: number; streamer: string }) {
  const [price, setPrice] = useState(String(defaultPrice));
  const [title, setTitle] = useState("");
  const cents = Math.round(Number(price.replace(",", ".")) * 100) || 0;
  const tooLow = cents > 0 && cents < 50;

  return (
    <div className="create-grid">
      <div className="fields">
        <label className="field">
          <span>Title</span>
          <input name="title" required maxLength={120} placeholder="Friday night session" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="field">
          <span id="price-label">Ticket price</span>
          <div className="chips" role="group" aria-labelledby="price-label">
            {PRESETS.map((p) => (
              <button type="button" key={p} className={`chip ${Number(price) === p ? "on" : ""}`} onClick={() => setPrice(String(p))} aria-pressed={Number(price) === p}>
                €{p}
              </button>
            ))}
            <div className="price-input">
              <span aria-hidden>€</span>
              <input name="price" type="number" inputMode="decimal" step="0.01" min="0.50" max="500" value={price} onChange={(e) => setPrice(e.target.value)} required aria-labelledby="price-label" />
            </div>
          </div>
          {tooLow && <small className="error">The lowest price card payments allow is €0.50.</small>}
        </div>
      </div>
      <div className="preview">
        <span className="preview-label">What viewers will see</span>
        <Ticket title={title || "Your stream title"} streamer={streamer} priceCents={cents} serial="0001" />
      </div>
    </div>
  );
}
