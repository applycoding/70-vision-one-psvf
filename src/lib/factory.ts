export const product = {
  name: "Performance Support Video Factory",
  owner: "Vision One Tech, LLC",
  marking: "UNCLASSIFIED // FOUO (synthetic demo)",
  disclaimer: "Synthetic demo manual. Not an official Navy publication.",
};

export const manual = {
  document: "S9550-AB-MMA-010",
  revision: "A",
  title: "EDG-450kW Operation and Maintenance (synthetic)",
  pages: 10,
  figures: 6,
};

export const procedures = [
  {
    id: "PROC-EDG-001",
    title: "Pre-Operational Inspection",
    revA: "Unchanged in the planned Rev B delta",
    revB: "Unchanged",
    staleOnRevB: false,
    figure: "Fig 5-1",
  },
  {
    id: "PROC-EDG-002",
    title: "Lube Oil Filter Replacement",
    revA: "Step 6 torque 35 ft-lb",
    revB: "Step 6 torque 42 ft-lb, mandatory oil sample, Fig 5-3",
    staleOnRevB: true,
    figure: "Fig 5-3",
  },
  {
    id: "PROC-EDG-003",
    title: "Cooling System Service",
    revA: "Coolant mix 50/50",
    revB: "Coolant mix 60/40 arctic, Fig 5-5",
    staleOnRevB: true,
    figure: "Fig 5-5",
  },
] as const;

export const figures = [
  {
    id: "Fig 3-1",
    detail:
      "EDG-450kW general arrangement: engine, alternator, radiator, LCP, battery bank, exhaust, fuel day tank.",
  },
  {
    id: "Fig 5-1",
    detail:
      "Pre-op inspection points: oil dipstick, coolant sight glass, fuel filter bowls, LCP, belts and belt tension.",
  },
  {
    id: "Fig 5-2",
    detail: "Lube oil filter location, color cutaway.",
  },
  {
    id: "Fig 5-3",
    detail: "Gasket lubrication and torque sequence 1–4. Rev A torque is 35 ft-lb.",
  },
  {
    id: "Fig 5-4",
    detail: "Coolant drains with blue flow arrows.",
  },
  {
    id: "Fig 5-5",
    detail: "Coolant mix and refractometer. Rev A mix is 50/50.",
  },
] as const;

export const layers = [
  {
    name: "Ingest and parse",
    detail:
      "pdf.js reads the PDF. GLM-5.3-Flash structures procedures, steps, warnings, tools, and parts, and keeps revision, section, page, and step provenance.",
  },
  {
    name: "Script and storyboard",
    detail:
      "GLM-5.3-Flash writes one narration line per step. Lucid Origin makes annotated stills. The storyboard sets captions, on-screen text, duration, and scene order.",
  },
  {
    name: "Render and package",
    detail:
      "Aura-2 EN speaks the script. Whisper Large V3 Turbo checks the transcript against the script. Mediabunny and WebCodecs composite the MP4 in Chrome. ffmpeg.wasm is the fallback encoder.",
  },
  {
    name: "Output and configuration management",
    detail:
      "The MP4, script, storyboard, stills, and captions stay linked from source document through video timecode. A section hash marks videos that a revision makes stale.",
  },
] as const;

export const demos = [
  {
    href: "/demos/factory",
    title: "Factory run",
    detail:
      "Ingest S9550-AB-MMA-010, extract PROC-EDG-001, and show source-to-timecode lineage.",
    status: "Phase 1 interactive demo — synthetic; no generated MP4 yet.",
  },
  {
    href: "/demos/change-impact",
    title: "Change impact",
    detail:
      "Compare Rev A with the planned Rev B torque and coolant changes, and see which videos go stale.",
    status: "Phase 1 interactive demo — synthetic; no generated MP4 yet.",
  },
  {
    href: "/demos/sme-review",
    title: "SME review",
    detail:
      "Flag a moment on the timeline, record the review, and follow it through re-render and republish.",
    status: "Phase 1 interactive demo — synthetic; no generated MP4 yet.",
  },
] as const;

export const lengths = [
  { value: "1", label: "1 minute" },
  { value: "3", label: "3 minutes" },
  { value: "5", label: "5 minutes" },
] as const;

export const tones = [
  { value: "instructional", label: "Instructional" },
  { value: "warnings-first", label: "Warnings first" },
  { value: "checklist", label: "Checklist" },
] as const;

export const timing = {
  online: "30–60 seconds",
  offline: "1.5–3 minutes on Apple M4",
  cost: "$0.88",
  note: "Estimate. Not a measured wall-clock and not a firm quote.",
};

/** Draft callouts taken from the spec’s Fig 5-1 description. Timecode stays empty until a stream exists. */
export const lineagePreview = [
  "Oil dipstick",
  "Coolant sight glass",
  "Fuel filter bowls",
  "LCP",
  "Belts and belt tension",
] as const;

export const reviewSamples = [
  {
    id: "rev-1",
    start: "00:18",
    end: "00:32",
    severity: "warn" as const,
    note: "Confirm the dipstick callout matches Fig 5-1 before publish.",
    source: "Fig 5-1 · oil dipstick",
    procedureId: "PROC-EDG-001",
  },
  {
    id: "rev-2",
    start: "01:05",
    end: "01:20",
    severity: "block" as const,
    note: "Torque callout still reads 35 ft-lb. The planned Rev B step is 42 ft-lb on Fig 5-3.",
    source: "PROC-EDG-002 · Fig 5-3",
    procedureId: "PROC-EDG-002",
  },
  {
    id: "rev-3",
    start: "02:10",
    end: "02:24",
    severity: "info" as const,
    note: "Coolant-mix still should name the refractometer from Fig 5-5.",
    source: "Fig 5-5",
    procedureId: "PROC-EDG-003",
  },
];
