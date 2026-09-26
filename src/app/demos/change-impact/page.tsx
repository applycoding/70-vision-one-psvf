import type { Metadata } from "next";
import { Phase1Banner } from "@/components/phase1-banner";
import { figures, manual, procedures } from "@/lib/factory";

export const metadata: Metadata = {
  title: "Change impact",
  description:
    "Public demo of Rev A versus the planned Rev B deltas and stale videos.",
};

export default function ChangeImpactPage() {
  return (
    <main>
      <section className="intro">
        <Phase1Banner />
        <p className="kicker">Demo 2 · no login</p>
        <h1>Change impact</h1>
        <p className="lead">
          The PDF body stays Rev {manual.revision}. The Rev B row is the labeled
          trigger for a selective re-render.
        </p>
        <p>
          A changed section hash marks the dependent video stale. PROC-EDG-001
          stays current.
        </p>
      </section>
      <div className="table-wrap">
        <table>
          <caption>Planned Rev B deltas for {manual.document}.</caption>
          <thead>
            <tr>
              <th scope="col">Procedure</th>
              <th scope="col">Rev A</th>
              <th scope="col">Planned Rev B</th>
              <th scope="col">Video</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map((procedure) => (
              <tr key={procedure.id}>
                <th scope="row">
                  {procedure.id}
                  <span className="cell-sub">{procedure.title}</span>
                </th>
                <td>{procedure.revA}</td>
                <td>{procedure.revB}</td>
                <td>{procedure.staleOnRevB ? "Stale" : "Current"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="stale-title">
        <h2 id="stale-title">Stale videos</h2>
        <p>
          Rev B is a planned delta. The authoritative PDF stays Rev A. These rows
          name the videos a section-hash change would mark stale. No MP4 exists
          for them.
        </p>
        <ul className="stale-list">
          <li>
            <strong>PROC-EDG-002</strong> Lube Oil Filter Replacement — stale.
            Torque 35→42 ft-lb. Fig 5-3.
          </li>
          <li>
            <strong>PROC-EDG-003</strong> Cooling System Service — stale. Coolant
            50/50→60/40. Fig 5-5.
          </li>
          <li>
            <strong>PROC-EDG-001</strong> Pre-Operational Inspection — unchanged.
            Not stale.
          </li>
        </ul>
      </section>
      <section aria-labelledby="figures-title">
        <h2 id="figures-title">Figures in the synthetic manual</h2>
        <dl className="facts">
          {figures.map((figure) => (
            <div key={figure.id}>
              <dt>{figure.id}</dt>
              <dd>{figure.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
