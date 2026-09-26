import type { Metadata } from "next";
import { Phase1Banner } from "@/components/phase1-banner";
import { ReviewBoard } from "@/components/review-board";

export const metadata: Metadata = {
  title: "SME review",
  description:
    "Public demo of inline timeline flags, review status, and the re-render path.",
};

export default function SmeReviewPage() {
  return (
    <main>
      <section className="intro">
        <Phase1Banner />
        <p className="kicker">Demo 3 · no login</p>
        <h1>SME review</h1>
        <p className="lead">
          Flag a span on the performance-support video, then send an accepted fix
          back through re-render and republish.
        </p>
        <p>
          Playback of this page does not ask you to sign in. In production, review
          actions require an authenticated reviewer. Accept and reject on this
          page stay in the browser. They are not written to the reviews store.
        </p>
      </section>
      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title">Timeline flags</h2>
        <p className="hint">
          Sample flags on a 3-minute slate. A block severity stops publish until
          the span is fixed and the voice check passes.
        </p>
        <ReviewBoard />
      </section>
      <section aria-labelledby="rerender-title">
        <h2 id="rerender-title">Re-render path</h2>
        <ol className="steps">
          <li>An accepted flag, or a stale section hash, opens a re-render job.</li>
          <li>The job regenerates the script, storyboard, audio, and video for the affected procedure.</li>
          <li>The new file is stored, the prior version stays for audit, and the public link moves to the new cut.</li>
          <li>Fixed spans close. A block stays closed only after the Whisper transcript check passes.</li>
        </ol>
      </section>
    </main>
  );
}
