import { drawSvgIcon } from "src/utils/svgToPdfIcon.js";

/**
 * Draws the presentation editor's PDF export by drawing directly into a
 * jsPDF document (real vector text/shapes/icons), mirroring the technique
 * used in generateSalesReportPdf.js. Every color/size/position here ports
 * PrintablePresentation.js's/FormationMap.js's JSX+Tailwind spec as-is; see
 * TASK_PRESENTATION_PDF_REWRITE.md for the full mapping.
 */

const PX_PER_MM = 96 / 25.4;
const PT_PER_MM = 72 / 25.4;

function mm(px) {
  return px / PX_PER_MM;
}

const VIRTUAL_WIDTH = 1000;
const BASE_ICON_SIZE_PX = 48; // settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX
const BASE_LABEL_MARGIN_PX = 3;

const WHITE = [255, 255, 255];
const GRAY_500 = [107, 114, 128];
const GRAY_800 = [31, 41, 55];

/**
 * Ports FormationMap.js's static-render path (isEditorMode=false only —
 * drag/drop, snap guides and the dashed grid never render in print).
 */
async function drawFormationMap(pdf, { x, y, width, height, elements }) {
  // FormationMap's icons/labels live inside a wrapper scaled by
  // `globalScale = containerWidthPx / VIRTUAL_WIDTH`, so every CSS px
  // constant they use (icon size, label font/padding/radius) is really a
  // "N virtual-units out of 1000" fraction of the stage's own width — this
  // converts such a constant straight to its mm equivalent for our stage box.
  const scaleToMm = (px) => (px / VIRTUAL_WIDTH) * width;

  if (!elements || elements.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(...GRAY_500);
    pdf.text(
      "Esta cena (formação) está vazia.",
      x + width / 2,
      y + height / 2,
      { align: "center" },
    );
    return;
  }

  const groups = new Map();
  for (const element of elements) {
    if (!groups.has(element.group_id)) {
      groups.set(element.group_id, {
        group_id: element.group_id,
        display_name: element.display_name,
        elements: [],
      });
    }
    groups.get(element.group_id).elements.push(element);
  }

  for (const group of groups.values()) {
    if (group.elements.length === 0) continue;
    const isPalcoGroup = group.elements[0]?.element_type_name === "Palco";

    for (const element of group.elements) {
      if (element.element_type_name === "Palco") {
        const lineY = y + (parseFloat(element.position_y) / 100) * height;
        pdf.setDrawColor(...GRAY_500);
        pdf.setLineWidth(mm(1));
        pdf.line(x, lineY, x + width, lineY);
        continue;
      }

      const centerX = x + (parseFloat(element.position_x) / 100) * width;
      const centerY = y + (parseFloat(element.position_y) / 100) * height;
      const scale = element.scale || 1.0;
      const iconSize = scaleToMm(BASE_ICON_SIZE_PX) * scale;
      await drawSvgIcon(pdf, element.image_url || "/favicon.svg", {
        x: centerX - iconSize / 2,
        y: centerY - iconSize / 2,
        width: iconSize,
        height: iconSize,
      });
    }

    if (isPalcoGroup || !group.display_name) continue;

    let maxY = -Infinity;
    for (const el of group.elements) {
      const elY = parseFloat(el.position_y);
      if (elY > maxY) maxY = elY;
    }
    const lowestElements = group.elements.filter(
      (el) => parseFloat(el.position_y) === maxY,
    );
    let anchor = lowestElements[0];
    for (const el of lowestElements) {
      if ((el.scale || 1.0) > (anchor.scale || 1.0)) anchor = el;
    }

    let minX = 100;
    let maxX = 0;
    for (const el of group.elements) {
      const elX = parseFloat(el.position_x);
      if (elX < minX) minX = elX;
      if (elX > maxX) maxX = elX;
    }

    const labelScale = anchor?.scale || 1.0;
    const labelXPercent = (minX + maxX) / 2;
    const marginOffsetMm =
      scaleToMm(BASE_ICON_SIZE_PX * labelScale) / 2 +
      scaleToMm(BASE_LABEL_MARGIN_PX);
    const labelCenterX = x + (labelXPercent / 100) * width;
    const labelTopY = y + (maxY / 100) * height + marginOffsetMm;

    const fontSizeMm = scaleToMm(12); // text-xs
    const fontSizePt = fontSizeMm * PT_PER_MM;
    const paddingXmm = scaleToMm(8); // px-2
    const paddingYmm = scaleToMm(2); // py-0.5
    const radiusMm = scaleToMm(6); // rounded-md
    const maxWidthMm = scaleToMm(150);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontSizePt);
    const textWidth = pdf.getTextWidth(group.display_name);
    const pillWidth = Math.min(textWidth + paddingXmm * 2, maxWidthMm);
    const pillHeight = fontSizeMm * 1.2 + paddingYmm * 2;

    pdf.setGState(new pdf.GState({ opacity: 0.8 })); // bg-gray-800 bg-opacity-80
    pdf.setFillColor(...GRAY_800);
    pdf.roundedRect(
      labelCenterX - pillWidth / 2,
      labelTopY,
      pillWidth,
      pillHeight,
      radiusMm,
      radiusMm,
      "F",
    );
    pdf.setGState(new pdf.GState({ opacity: 1 }));

    pdf.setTextColor(...WHITE);
    pdf.text(
      group.display_name,
      labelCenterX,
      labelTopY + pillHeight / 2 + fontSizeMm * 0.35,
      { align: "center" },
    );
  }
}

export { drawFormationMap };
