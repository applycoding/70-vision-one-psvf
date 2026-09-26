import Link from "next/link";
import { JobForm } from "@/components/job-form";
import { RunCloudJob } from "@/components/run-cloud-job";
import { demos, layers, manual, product, timing } from "@/lib/factory";

export default function Home() {
  return (
    <main>
      <section className="intro">
        <p className="kicker">{product.owner}</p>
        <h1>{product.name}</h1>
        <p className="lead">
          Choose the section, length, tone, and revision, then start a generation
          job for {manual.document}.
        </p>
        <p>
          {manual.title}. {manual.pages} pages, {manual.figures} figures, Rev{" "}
          {manual.revision}.
        </p>
      </section>

      <RunCloudJob />
      <JobForm />

      <section className="line" aria-labelledby="layers-title">
        <h2 id="layers-title">Pipeline</h2>
        <ol>
          {layers.map((layer) => (
            <li key={layer.name}>
              <h3>{layer.name}</h3>
              <p>{layer.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="demos-title">
        <h2 id="demos-title">Public demos</h2>
        <p className="hint">
          Three no-login clips, each at or under 5 minutes. Streams are not
          published yet.
        </p>
        <ul className="demo-list">
          {demos.map((demo, index) => (
            <li key={demo.href}>
              <h3>
                <Link href={demo.href}>
                  {index + 1}. {demo.title}
                </Link>
              </h3>
              <p>{demo.detail}</p>
              <p className="hint">{demo.status}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="timing-title">
        <h2 id="timing-title">Timing</h2>
        <dl className="facts">
          <div>
            <dt>Online path</dt>
            <dd>
              {timing.online}. {timing.note}
            </dd>
          </div>
          <div>
            <dt>Offline path</dt>
            <dd>
              pdf.js, page-crop stills, optional Kokoro speech, and Mediabunny on
              the device. {timing.offline}. {timing.note}
            </dd>
          </div>
          <div>
            <dt>Planning cost</dt>
            <dd>
              About {timing.cost} per cloud video. Update this after a metered run.
            </dd>
          </div>
          <div>
            <dt>Encode browser</dt>
            <dd>
              Chrome is required for generate and encode demos. Firefox on Android
              cannot encode on the device.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
