/** Initial note. Ingest replaces this after pdf.js reads the uploaded PDF. */
export const SOURCE_NOTE =
  "Waiting for pdf.js to parse the uploaded PDF. The original S9550 file was not in the workspace.";

export const PROCEDURE_SOURCE = `
Document: S9550-AB-MMA-010
Revision: A
Title: EDG-450kW Operation and Maintenance (synthetic)
Procedure: PROC-EDG-001 Pre-Operational Inspection
Figure: Fig 5-1 Pre-op inspection points
Page: 5
Marking: UNCLASSIFIED // FOUO synthetic demo. Not an official Navy publication.

Warnings
- Stop the inspection if you smell fuel, see a leak, or hear an unexpected alarm on the local control panel.
- Keep hands clear of belts while the engine can be cranked.
- Do not start the set until every inspection point below has been checked.

Step 1. Oil dipstick
Read the oil level on the dipstick with the engine stopped and the set level. The level must sit between the add and full marks. If it is below add, do not start. Record the reading and the figure callout Fig 5-1.

Step 2. Coolant sight glass
Look at the coolant sight glass. The level must be visible in the glass. If the glass is empty or the coolant looks oily, stop and report it. This check uses Fig 5-1.

Step 3. Fuel filter bowls
Inspect both fuel filter bowls for water, dirt, and cracks. Drain water only if the bowl procedure says the valve is closed and a container is in place. Leave the bowls clean and seated. Figure reference Fig 5-1.

Step 4. Local control panel
At the LCP, confirm the panel is powered, no red alarm is latched, and the selector is in the position required before a start. Read each alarm label before you clear it. Figure reference Fig 5-1.

Step 5. Belts and belt tension
Look at the belts for cracks, glaze, and fray. Check belt tension by the deflection the figure shows, not by guessing. Keep fingers off the belt run. Figure reference Fig 5-1.

Close the inspection by stating that PROC-EDG-001 Rev A is complete only when all five Fig 5-1 points are recorded.
`.trim();

export const DOCUMENT_ID = "S9550-AB-MMA-010";
export const REVISION = "A";
export const PROCEDURE_ID = "PROC-EDG-001";
export const TARGET_DURATION_MS = 180_000;
export const WHISPER_THRESHOLD = 0.95;
