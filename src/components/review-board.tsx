"use client";

import { useState } from "react";
import { reviewSamples } from "@/lib/factory";

type Status = "open" | "accepted" | "rejected";

export function ReviewBoard() {
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(reviewSamples.map((item) => [item.id, "open"])),
  );

  return (
    <ol className="reviews">
      {reviewSamples.map((item) => (
        <li key={item.id}>
          <article>
            <header>
              <p>
                {item.start}–{item.end}
              </p>
              <p className={`severity severity-${item.severity}`}>{item.severity}</p>
              <p>{status[item.id]}</p>
            </header>
            <h3>{item.source}</h3>
            <p>{item.note}</p>
            <p className="hint">{item.procedureId}</p>
            <div className="review-actions">
              <button
                type="button"
                onClick={() =>
                  setStatus((current) => ({ ...current, [item.id]: "accepted" }))
                }
              >
                Accept fix
              </button>
              <button
                type="button"
                onClick={() =>
                  setStatus((current) => ({ ...current, [item.id]: "rejected" }))
                }
              >
                Reject
              </button>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
