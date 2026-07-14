import jsPDF from "jspdf";
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

function pxToPt(px) {
  return px * 0.75;
}

const VIRTUAL_WIDTH = 1000;
const BASE_ICON_SIZE_PX = 48; // settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX
const BASE_LABEL_MARGIN_PX = 3;

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const GRAY_900 = [17, 24, 39];
const GRAY_800 = [31, 41, 55];
const GRAY_700 = [55, 65, 81];
const GRAY_600 = [75, 85, 99];
const GRAY_500 = [107, 114, 128];
const GRAY_400 = [156, 163, 175];
const GRAY_300 = [209, 213, 219];
const GRAY_200 = [229, 231, 235];
const GRAY_100 = [243, 244, 246];
const GRAY_50 = [249, 250, 251];
const YELLOW_50 = [254, 252, 232];
const YELLOW_100 = [254, 249, 195];

const LOGO_ASPECT_RATIO = 556.51203 / 261.39498;

function truncateText(pdf, text, maxWidth) {
  if (!text) return "";
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && pdf.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function formatDateTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

/**
 * Cover page — logo box, name/description, date/location info grid.
 * Ports PrintablePresentation.js's detailed-mode cover page.
 */
async function addCoverPage(
  pdf,
  { presentation, formattedDate, formattedMeetTime, pageW, pageH },
) {
  const centerX = pageW / 2;

  // --- Logo box (bg-gray-800 p-12 rounded-2xl) ---
  const logoHeightMm = mm(160); // h-40
  const logoWidthMm = logoHeightMm * LOGO_ASPECT_RATIO;
  const logoPaddingMm = mm(48); // p-12
  const logoBoxWidthMm = logoWidthMm + logoPaddingMm * 2;
  const logoBoxHeightMm = logoHeightMm + logoPaddingMm * 2;

  // --- Info grid sizing (grid-cols-2 gap-8 p-6 min-w-[500px]) ---
  // min-w-[500px] is a floor, not a cap — the real grid grows to fit its
  // widest row (a long location/address shouldn't get truncated), so measure
  // each row's text before deciding the grid's actual width.
  const gridPaddingMm = mm(24); // p-6
  const gridGapMm = mm(32); // gap-8
  const colInnerPaddingMm = mm(16); // pr-4 / pl-4
  const iconSizeMm = mm(20); // text-xl-ish icon box
  const iconGapMm = mm(12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(pxToPt(18));
  const rowTextWidth = (text) =>
    text ? pdf.getTextWidth(text) + iconSizeMm + iconGapMm : 0;
  const leftRowsWidthMm = Math.max(
    rowTextWidth(formattedDate),
    rowTextWidth(presentation.location),
  );
  const rightRowsWidthMm = Math.max(
    rowTextWidth(formattedMeetTime || "Horário não definido"),
    rowTextWidth(presentation.meet_location),
  );
  const colWidthMm =
    Math.max(leftRowsWidthMm, rightRowsWidthMm, mm(210)) + colInnerPaddingMm;
  const gridWidthMm = Math.max(
    mm(500),
    colWidthMm * 2 + gridGapMm + gridPaddingMm * 2,
  );

  const hasDescription = Boolean(presentation.description);
  const descriptionMaxWidthMm = mm(672); // max-w-2xl
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(pxToPt(20));
  const descriptionLines = hasDescription
    ? pdf.splitTextToSize(presentation.description, descriptionMaxWidthMm)
    : [];

  const rightColRows = formattedMeetTime
    ? 1
    : presentation.meet_location
      ? 0
      : 1; // "Horário não definido" placeholder counts as a row too
  const leftRowCount =
    (formattedDate ? 1 : 0) + (presentation.location ? 1 : 0);
  const rightRowCount =
    rightColRows + (presentation.meet_location ? 1 : 0) || 1;
  const maxRows = Math.max(leftRowCount, rightRowCount, 1);
  const rowHeightMm = mm(18) + mm(12); // text-lg line height + space-y-3 gap
  const gridBodyHeightMm = mm(20) + maxRows * rowHeightMm; // header row + rows
  const gridHeightMm = gridBodyHeightMm + gridPaddingMm * 2;

  const contentHeightMm =
    logoBoxHeightMm +
    mm(32) + // mb-8
    mm(44) + // title line height (text-4xl) + mb-2
    (hasDescription ? descriptionLines.length * mm(26) + mm(32) : 0) +
    gridHeightMm;

  let cursorY = (pageH - contentHeightMm) / 2;

  // Logo box
  pdf.setFillColor(...GRAY_800);
  pdf.roundedRect(
    centerX - logoBoxWidthMm / 2,
    cursorY,
    logoBoxWidthMm,
    logoBoxHeightMm,
    mm(16),
    mm(16),
    "F",
  );
  await drawSvgIcon(pdf, "/images/logoColoridoV2.svg", {
    x: centerX - logoWidthMm / 2,
    y: cursorY + logoPaddingMm,
    width: logoWidthMm,
    height: logoHeightMm,
  });
  cursorY += logoBoxHeightMm + mm(32);

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(36));
  pdf.setTextColor(...GRAY_900);
  pdf.text(presentation.name.toUpperCase(), centerX, cursorY + mm(28), {
    align: "center",
  });
  cursorY += mm(44);

  // Description
  if (hasDescription) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(pxToPt(20));
    pdf.setTextColor(...GRAY_600);
    descriptionLines.forEach((line, i) => {
      pdf.text(line, centerX, cursorY + mm(20) + i * mm(26), {
        align: "center",
      });
    });
    cursorY += descriptionLines.length * mm(26) + mm(32);
  }

  // Info grid background
  pdf.setFillColor(...GRAY_50);
  pdf.setDrawColor(...GRAY_200);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(
    centerX - gridWidthMm / 2,
    cursorY,
    gridWidthMm,
    gridHeightMm,
    mm(8),
    mm(8),
    "FD",
  );

  const leftColX = centerX - gridWidthMm / 2 + gridPaddingMm;
  const rightColX = centerX + gridGapMm / 2;
  pdf.setDrawColor(...GRAY_300);
  pdf.line(
    centerX - gridGapMm / 2,
    cursorY + gridPaddingMm,
    centerX - gridGapMm / 2,
    cursorY + gridHeightMm - gridPaddingMm,
  ); // border-r border-gray-300

  let leftY = cursorY + gridPaddingMm;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(14));
  pdf.setTextColor(...GRAY_400);
  pdf.text("APRESENTAÇÃO", leftColX, leftY + mm(10));
  leftY += mm(20);

  // The pdf-*.svg assets already have their real on-screen stroke color
  // baked in (see public/images/pdf-*.svg), so drawing them needs no tint.
  const drawInfoRow = async (
    colX,
    colWidth,
    rowY,
    iconUrl,
    text,
    textColor,
  ) => {
    await drawSvgIcon(pdf, iconUrl, {
      x: colX,
      y: rowY - mm(14),
      width: iconSizeMm,
      height: iconSizeMm,
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(pxToPt(18));
    pdf.setTextColor(...textColor);
    pdf.text(
      truncateText(pdf, text, colWidth - iconSizeMm - iconGapMm),
      colX + iconSizeMm + iconGapMm,
      rowY,
    );
  };

  if (formattedDate) {
    await drawInfoRow(
      leftColX,
      colWidthMm - colInnerPaddingMm,
      leftY,
      "/images/pdf-calendar.svg",
      formattedDate,
      GRAY_800,
    );
    leftY += rowHeightMm;
  }
  if (presentation.location) {
    await drawInfoRow(
      leftColX,
      colWidthMm - colInnerPaddingMm,
      leftY,
      "/images/pdf-map-pin.svg",
      presentation.location,
      GRAY_700,
    );
    leftY += rowHeightMm;
  }

  let rightY = cursorY + gridPaddingMm;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(14));
  pdf.setTextColor(...GRAY_400);
  pdf.text("ENCONTRO / SAÍDA", rightColX, rightY + mm(10));
  rightY += mm(20);

  if (formattedMeetTime) {
    await drawInfoRow(
      rightColX,
      colWidthMm - colInnerPaddingMm,
      rightY,
      "/images/pdf-clock.svg",
      formattedMeetTime,
      GRAY_800,
    );
    rightY += rowHeightMm;
  } else {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(pxToPt(16));
    pdf.setTextColor(...GRAY_400);
    pdf.text("Horário não definido", rightColX, rightY);
    rightY += rowHeightMm;
  }
  if (presentation.meet_location) {
    await drawInfoRow(
      rightColX,
      colWidthMm - colInnerPaddingMm,
      rightY,
      "/images/pdf-navigation.svg",
      presentation.meet_location,
      GRAY_700,
    );
    rightY += rowHeightMm;
  }
}

/**
 * One page per FORMATION scene — big FormationMap + a side panel listing
 * the transition scenes that preceded it. Ports the detailed-mode formation
 * pages from PrintablePresentation.js.
 */
async function addFormationPage(pdf, { pageData, pageW, pageH }) {
  const marginMm = 10;
  const contentW = pageW - marginMm * 2;
  const contentH = pageH - marginMm * 2;
  const contentX = marginMm;
  const contentY = marginMm;

  const headerHeightMm = contentH * 0.1;
  const bodyHeightMm = contentH * 0.9;
  const bodyY = contentY + headerHeightMm;

  // --- Header ---
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(36));
  pdf.setTextColor(...GRAY_900);
  const indexText = `${pageData.index}.`;
  pdf.text(indexText, contentX, contentY + mm(24));
  const indexWidth = pdf.getTextWidth(indexText);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(30));
  pdf.setTextColor(...GRAY_800);
  pdf.text(
    truncateText(
      pdf,
      pageData.formation.name.toUpperCase(),
      contentW - indexWidth - mm(12),
    ),
    contentX + indexWidth + mm(12),
    contentY + mm(24),
  );

  if (pageData.formation.description) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(pxToPt(14));
    pdf.setTextColor(...GRAY_600);
    pdf.text(
      truncateText(pdf, pageData.formation.description, contentW - mm(4)),
      contentX + mm(4),
      contentY + mm(34),
    );
  }

  pdf.setDrawColor(...GRAY_800);
  pdf.setLineWidth(0.75);
  pdf.line(
    contentX,
    contentY + headerHeightMm - mm(2),
    contentX + contentW,
    contentY + headerHeightMm - mm(2),
  );

  // --- Body: map panel (75%) + transitions panel (25%), gap-4 between ---
  const gapMm = mm(16);
  const mapWidthMm = (contentW - gapMm) * 0.75;
  const transWidthMm = (contentW - gapMm) * 0.25;
  const transX = contentX + mapWidthMm + gapMm;

  pdf.setFillColor(...GRAY_50);
  pdf.setDrawColor(...GRAY_300);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(
    contentX,
    bodyY,
    mapWidthMm,
    bodyHeightMm,
    mm(8),
    mm(8),
    "FD",
  );
  await drawFormationMap(pdf, {
    x: contentX + mm(2),
    y: bodyY + mm(2),
    width: mapWidthMm - mm(4),
    height: bodyHeightMm - mm(4),
    elements: pageData.formation.scene_elements,
  });

  pdf.setFillColor(...WHITE);
  pdf.setDrawColor(...GRAY_200);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(
    transX,
    bodyY,
    transWidthMm,
    bodyHeightMm,
    mm(8),
    mm(8),
    "FD",
  );

  const transPadMm = mm(12); // p-3
  let transY = bodyY + transPadMm;
  const transInnerX = transX + transPadMm;
  const transInnerWidth = transWidthMm - transPadMm * 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(12));
  pdf.setTextColor(...GRAY_400);
  pdf.text("TRANSIÇÕES", transInnerX, transY + mm(8));
  transY += mm(14);
  pdf.setDrawColor(...GRAY_100);
  pdf.setLineWidth(0.2);
  pdf.line(transInnerX, transY, transInnerX + transInnerWidth, transY);
  transY += mm(8);

  if (pageData.transitions.length === 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(pxToPt(14));
    pdf.setTextColor(...GRAY_400);
    pdf.text(
      "Sem transição",
      transX + transWidthMm / 2,
      bodyY + bodyHeightMm / 2,
      {
        align: "center",
      },
    );
  } else {
    for (const trans of pageData.transitions) {
      const blockStartY = transY;
      const textX = transInnerX + mm(8); // pl-2

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(pxToPt(14));
      pdf.setTextColor(...GRAY_800);
      pdf.text(
        truncateText(pdf, trans.name, transInnerWidth - mm(8)),
        textX,
        transY,
      );
      transY += mm(11);

      if (trans.description) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(pxToPt(10));
        pdf.setTextColor(...GRAY_500);
        const descLines = pdf.splitTextToSize(
          trans.description,
          transInnerWidth - mm(8),
        );
        descLines.forEach((line) => {
          pdf.text(line, textX, transY);
          transY += mm(9);
        });
      }
      transY += mm(3);

      if (trans.transition_steps.length === 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(pxToPt(10));
        pdf.setTextColor(...GRAY_400);
        pdf.text("Direto (sem passos)", textX + mm(4), transY);
        transY += mm(9);
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(pxToPt(11));
        for (const step of trans.transition_steps) {
          pdf.setFillColor(...GRAY_400);
          pdf.circle(textX + mm(2), transY - mm(2.5), mm(2), "F");
          pdf.setTextColor(...GRAY_700);
          const stepLines = pdf.splitTextToSize(
            step.description,
            transInnerWidth - mm(12),
          );
          stepLines.forEach((line, i) => {
            pdf.text(line, textX + mm(6), transY + i * mm(9));
          });
          transY += stepLines.length * mm(9) + mm(3);
        }
      }

      pdf.setDrawColor(...GRAY_300);
      pdf.setLineWidth(1.1); // border-l-4
      pdf.line(transInnerX, blockStartY - mm(9), transInnerX, transY - mm(3));

      transY += mm(16); // space-y-4 between transitions
    }
  }
}

/**
 * Final summary page — setlist + final comments.
 */
function addSummaryPage(pdf, { setlist, finalComments, pageW, pageH }) {
  const marginMm = 15;
  const contentX = marginMm;
  const contentY = marginMm;
  const contentW = pageW - marginMm * 2;
  const contentH = pageH - marginMm * 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(30));
  pdf.setTextColor(...GRAY_900);
  pdf.text("RESUMO FINAL", contentX, contentY + mm(20));
  pdf.setDrawColor(...GRAY_200);
  pdf.setLineWidth(0.5);
  pdf.line(contentX, contentY + mm(28), contentX + contentW, contentY + mm(28));

  const bodyY = contentY + mm(28) + mm(32); // pb-4 + mb-8 equivalent
  const bodyHeight = contentH - (bodyY - contentY);
  const gapMm = mm(40); // gap-10
  const colWidth = (contentW - gapMm) / 2;
  const leftX = contentX;
  const rightX = contentX + colWidth + gapMm;

  pdf.setDrawColor(...GRAY_200);
  pdf.setLineWidth(0.3);
  pdf.line(
    leftX + colWidth + gapMm / 2,
    bodyY,
    leftX + colWidth + gapMm / 2,
    bodyY + bodyHeight,
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(20));
  pdf.setTextColor(...BLACK);
  pdf.text("Ordem das músicas", leftX, bodyY + mm(16));

  let itemY = bodyY + mm(16) + mm(24);
  setlist.forEach((scene, idx) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(pxToPt(18));
    pdf.setTextColor(...GRAY_400);
    const indexText = `${idx + 1}.`;
    pdf.text(indexText, leftX + mm(32), itemY, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...GRAY_800);
    pdf.text(
      truncateText(pdf, scene.name, colWidth - mm(48)),
      leftX + mm(48),
      itemY,
    );
    itemY += mm(24);
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(pxToPt(20));
  pdf.setTextColor(...GRAY_700);
  pdf.text("Observações Finais", rightX, bodyY + mm(16));

  if (finalComments) {
    const boxPad = mm(24); // p-6
    const boxY = bodyY + mm(16) + mm(24);
    const boxWidth = colWidth;
    pdf.setFont("helvetica", "normal"); // font-medium
    pdf.setFontSize(pxToPt(15));
    const lines = pdf.splitTextToSize(finalComments, boxWidth - boxPad * 2);
    const boxHeight = lines.length * mm(20) + boxPad * 2;

    pdf.setFillColor(...YELLOW_50);
    pdf.setDrawColor(...YELLOW_100);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(rightX, boxY, boxWidth, boxHeight, mm(8), mm(8), "FD");

    pdf.setTextColor(...GRAY_800);
    lines.forEach((line, i) => {
      pdf.text(line, rightX + boxPad, boxY + boxPad + mm(12) + i * mm(20));
    });
  } else {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(pxToPt(16));
    pdf.setTextColor(...GRAY_400);
    pdf.text(
      "Nenhuma observação final registrada.",
      rightX,
      bodyY + mm(16) + mm(24),
    );
  }
}

/**
 * Builds and downloads the presentation PDF, mirroring the shape of
 * generateSalesReportPdf.js: constants/helpers above, one exported entry
 * point, pdf.save(fileName) at the end. Must be async (unlike the sales
 * report) because drawing SVG icons is inherently promise-based — this is
 * genuine I/O (fetching a small fixed set of static files, cached), not a
 * revival of the old ref/setTimeout DOM-paint workaround.
 */
export async function generatePresentationPdf({
  presentation,
  comments,
  isCompact,
  fileName,
}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const formattedDate = formatDateTime(presentation.date);
  const formattedMeetTime = formatDateTime(presentation.meet_time);

  if (!isCompact) {
    await addCoverPage(pdf, {
      presentation,
      formattedDate,
      formattedMeetTime,
      pageW,
      pageH,
    });

    const detailedPages = [];
    let currentTransitions = [];
    let formationIndex = 1;
    for (const scene of presentation.scenes) {
      if (scene.scene_type === "FORMATION") {
        detailedPages.push({
          formation: scene,
          transitions: [...currentTransitions],
          index: formationIndex,
        });
        formationIndex++;
        currentTransitions = [];
      } else {
        currentTransitions.push(scene);
      }
    }

    for (const pageData of detailedPages) {
      pdf.addPage();
      await addFormationPage(pdf, { pageData, pageW, pageH });
    }

    pdf.addPage();
    const setlist = presentation.scenes.filter(
      (s) => s.scene_type === "FORMATION",
    );
    addSummaryPage(pdf, { setlist, finalComments: comments, pageW, pageH });
  }

  pdf.save(fileName);
}

export { drawFormationMap };
