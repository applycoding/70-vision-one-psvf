import { writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";

const pages = [
  [
    "S9550-AB-MMA-010  Rev A",
    "EDG-450kW Operation and Maintenance (synthetic)",
    "UNCLASSIFIED // FOUO. Synthetic demo. Not an official Navy publication.",
    "This file was generated for the Performance Support Video Factory because the original demo PDF bytes were not in the workspace.",
    "Procedures in this manual: PROC-EDG-001 Pre-Operational Inspection, PROC-EDG-002 Lube Oil Filter Replacement, PROC-EDG-003 Cooling System Service.",
  ],
  [
    "Warnings for all procedures",
    "Stop the inspection if you smell fuel, see a leak, or hear an unexpected alarm on the local control panel.",
    "Keep hands clear of belts while the engine can be cranked.",
    "Do not start the set until every inspection point in the selected procedure has been checked and recorded.",
  ],
  [
    "PROC-EDG-001 Pre-Operational Inspection. Figure Fig 5-1. Page 3.",
    "Step 1. Oil dipstick. Read the oil level on the dipstick with the engine stopped and the set level. The level must sit between the add and full marks. If it is below add, do not start. Record the reading against Fig 5-1.",
    "Step 2. Coolant sight glass. Look at the coolant sight glass. The level must be visible in the glass. If the glass is empty or the coolant looks oily, stop and report it. This check uses Fig 5-1.",
  ],
  [
    "PROC-EDG-001 continued. Figure Fig 5-1. Page 4.",
    "Step 3. Fuel filter bowls. Inspect both fuel filter bowls for water, dirt, and cracks. Drain water only when the bowl valve is closed and a container is in place. Leave the bowls clean and seated. Figure reference Fig 5-1.",
    "Step 4. Local control panel. At the LCP, confirm the panel is powered, no red alarm is latched, and the selector is in the position required before a start. Read each alarm label before you clear it. Figure reference Fig 5-1.",
  ],
  [
    "PROC-EDG-001 continued. Figure Fig 5-1. Page 5.",
    "Step 5. Belts and belt tension. Look at the belts for cracks, glaze, and fray. Check belt tension by the deflection Fig 5-1 shows, not by guessing. Keep fingers off the belt run.",
    "Close PROC-EDG-001 Rev A only when all five Fig 5-1 points are recorded. Do not apply the Rev B torque or coolant-mix changes here. Those belong to other procedures.",
  ],
  [
    "PROC-EDG-002 Lube Oil Filter Replacement. Rev A. Figure Fig 5-3. Page 6.",
    "Replace the lube oil filter with the engine stopped. Lubricate the gasket and follow torque sequence 1 through 4.",
    "Rev A step 6 torque is 35 ft-lb. Fig 5-3 shows the gasket and the torque sequence. This procedure is not the narration target for the three-minute demo.",
  ],
  [
    "PROC-EDG-002 notes. Page 7.",
    "Confirm the old filter is removed, the sealing surface is clean, and the new filter is seated before torque.",
    "Record the torque value from Rev A, which is 35 ft-lb, next to Fig 5-3.",
  ],
  [
    "PROC-EDG-003 Cooling System Service. Rev A. Figure Fig 5-5. Page 8.",
    "Service the cooling system with the engine stopped and cool. Fig 5-4 shows the coolant drains. Fig 5-5 shows the mix check with a refractometer.",
    "Rev A coolant mix is 50/50. Do not use the planned Rev B arctic mix in this revision.",
  ],
  [
    "PROC-EDG-003 notes. Page 9.",
    "Drain, refill, and verify the sight glass after the mix check. Keep the refractometer reading with the job record.",
    "Fig 5-5 is the coolant mix figure for Rev A.",
  ],
  [
    "Document close. Page 10.",
    "Document S9550-AB-MMA-010 Rev A. Ten pages. Procedures PROC-EDG-001, PROC-EDG-002, and PROC-EDG-003.",
    "The performance-support video for this demo narrates PROC-EDG-001 only.",
  ],
];

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
doc.setTitle("S9550-AB-MMA-010 Rev A EDG-450kW (synthetic)");
doc.setSubject("Synthetic demo manual for pdf.js ingest. Not an official publication.");

for (const [title, ...paragraphs] of pages) {
  const page = doc.addPage([612, 792]);
  let y = 740;
  page.drawText(title, { x: 50, y, size: 14, font: bold, maxWidth: 500 });
  y -= 36;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, 11) > 500) {
        page.drawText(line, { x: 50, y, size: 11, font });
        y -= 16;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 24;
    }
  }
}

const bytes = await doc.save();
await writeFile(new URL("../manuals/S9550-AB-MMA-010_RevA_synthetic.pdf", import.meta.url), bytes);
console.log(`pages ${pages.length} bytes ${bytes.length}`);
