# Task: rewrite the presentation PDF export as native vector output

## Context

We just finished doing this exact migration for the PDV sales report
(see `src/utils/generateSalesReportPdf.js`, added in this repo's git history
under commits `feat(pdv): rewrite sales report PDF as native vector output`
and the one before it). The old sales-report PDF rendered a hidden DOM tree
with `html-to-image` and embedded the screenshots as PNGs inside the PDF via
jsPDF — the text came out blurry at any zoom, couldn't be selected, and a
5-page report weighed **~13MB** (at `pixelRatio: 1`; **~120MB** at the
previous default of `pixelRatio: 3`). Rewriting it to draw real vector
text/tables/shapes directly with jsPDF + `jspdf-autotable` dropped the same
report to **~70KB** with crisp text at any zoom.

The presentation editor's PDF export (`components/presentation/*`,
`src/utils/pdfGenerator.js`) has the **exact same problem, for the exact same
reason** — it's the same DOM-screenshot approach, just applied to a different
screen. The user wants it rewritten the same way we just did for the sales
report. The stage/formation elements are already saved as small SVG icon
files (not photos), and everything else on the page is plain text — there is
no principled reason this needs to be a raster screenshot at all.

**Read `src/utils/generateSalesReportPdf.js` first.** It's the reference
implementation for "how we draw native-vector PDFs in this codebase now" —
copy its *technique* (a plain exported function that builds a jsPDF document
with small private helpers above it, `jspdf-autotable` for tabular bits,
`pdf.save(fileName)` at the end, no DOM/`html-to-image` anywhere). **Do not
copy its visual constants.** The sales report's purple/gray palette, fonts,
and spacing were designed for *that* report and are irrelevant here — the
presentation PDF's own existing look (as defined today in
`PrintablePresentation.js`'s JSX/Tailwind classes) is the only source of
truth for colors, sizes, and spacing in this task. See the callout below.

## This is a rendering-technique change only — not a redesign

**The visual output must not change.** Every color, shape, size, font
choice, and position on the page — the cover layout, the formation map's
proportions, icon sizes, label styling, the transitions side panel, page
margins, all of it — stays pixel-for-pixel identical to what
`PrintablePresentation.js` produces today. `FormationMap.js`,
`StageElement.js`, `StageLine.js`, and the JSX/Tailwind classes throughout
`PrintablePresentation.js` are the **exact spec** to port from — read the
actual `className` values (colors, font sizes, padding, border widths) and
replicate those numbers in the jsPDF drawing code, don't approximate or
"clean up" them.

The *only* thing this task changes is *how* the PDF bytes get produced:
today, the page is rendered as HTML/CSS, screenshotted to a raster PNG, and
that image is glued into the PDF; after this task, the same visual content
is produced by drawing real vector shapes/text (via jsPDF's native
`text()`/`rect()`/`line()` calls) and real vector SVG icons (via
`svg2pdf.js`, instead of rasterizing the `<Image>` that currently renders
them) directly into the PDF. That swap is what buys the file-size drop and
the "crisp at any zoom" quality — not any change to what's drawn. If you
find yourself changing a color, a gap, or a size "because it looks better
this way," stop — that's out of scope for this task, revert it, and (if you
think it's a genuine improvement) mention it to the user separately instead
of bundling it in.

## Definition of done

- Clicking "Gerar PDF" in the presentation editor produces a PDF built by
  drawing directly into a jsPDF document (text via `pdf.text()`, the stage
  formation map via **real vector SVG** — see below) — no
  `html-to-image`/`toPng()` screenshot of a hidden DOM tree anywhere in the
  PDF code path.
- Output is visibly crisp at high zoom and dramatically smaller than today's
  file (expect a similar order-of-magnitude drop as the sales report saw).
- Both existing print modes (compact / detailed — see below) look
  **identical** to today's output — same colors, same shapes/sizes, same
  positions, same information in the same places. This is a
  rendering-technique change, not a redesign; see the callout above.
- The "Gerar PNG" button (`handleDownloadPng` in `usePresentationEditor.js`)
  is **out of scope** — PNG is inherently raster, leave that path exactly as
  it is. Only the PDF path changes.
- Once the new path is verified working, delete the old DOM-screenshot
  printable component and the now-dead parts of `pdfGenerator.js`/its call
  sites, the same way `components/pdv/admin/PrintableSalesReport.js` was
  deleted at the end of the sales-report migration. Do **not** delete
  `src/utils/pdfGenerator.js` itself without checking nothing else still
  imports it first (nothing should, once this is done, but verify).

## Current architecture (read these before touching anything)

- **`src/utils/pdfGenerator.js`** (93 lines) — `generatePDF(elementRef,
  fileName, isCompact, pixelRatio)`. jsPDF `{orientation: "landscape", unit:
  "mm", format: "a4"}` + `html-to-image`'s `toPng()` on each
  `.pdf-page-container` child of `elementRef`, `pdf.addImage()` per page.
  This is the function being replaced.
- **`components/presentation/PrintablePresentation.js`** (432 lines) — the
  hidden DOM tree that gets screenshotted today. `React.forwardRef`, always
  mounted off-screen (`fixed left-[-9999px] top-[-9999px]`, **not**
  `display:none` — needs to be laid out to be captured) at the bottom of
  `pages/apresentacoes/[id].js`. This is your best source of truth for
  **what the output should look like** (fonts, spacing, colors, what text
  appears where) — read it fully before designing the vector version.
  - **Compact mode** (`isCompact=true`): single page, 3-column CSS-columns
    layout, one mini `FormationMap` per FORMATION scene + a transitions
    list + final comments. One `.pdf-page-container`.
  - **Detailed mode** (`isCompact=false`, the default): a cover page (logo,
    presentation name/description, date, location, meet time/location), one
    full page per FORMATION scene (big `FormationMap` + a side panel
    listing the transition scenes that preceded it), and a final summary
    page (setlist + final comments). One `.pdf-page-container` per page.
  - Note the font-embedding workaround at the top of the file (a `<style
    media="print">` block `@import`-ing Poppins from Google Fonts, because
    `html-to-image` doesn't reliably inherit `next/font`'s CSS var). **This
    whole problem disappears** once you're drawing native jsPDF text — just
    pick a jsPDF standard font (`helvetica` is what the sales-report PDF
    uses) unless you want to invest in properly embedding a Poppins TTF via
    `pdf.addFont()` (doable, but nobody has a local `.ttf`/`.woff` file for
    it right now — `next/font/google` self-hosts it at build time, it's not
    a plain static asset in this repo — so treat that as a nice-to-have,
    not a requirement).
- **`components/presentation/FormationMap.js`** (609 lines) — the actual
  stage renderer, used both live in the editor and (with `isEditorMode:
  false`, `loggedInUser: null`) inside `PrintablePresentation`. This is the
  hard part. Key facts:
  - Virtual coordinate space: `VIRTUAL_WIDTH = 1000`, `VIRTUAL_HEIGHT = 750`
    (`VIRTUAL_WIDTH * 3/4`). Every element's `position_x`/`position_y` is a
    **percentage (0–100)** of that virtual box, not raw pixels.
  - `BASE_ICON_SIZE_PX = 48` (from `config/settings.js`,
    `STAGE_MAP_SNAP.BASE_ICON_SIZE_PX`) is the icon's base size at
    `element.scale = 1.0`, inside the virtual 1000×750 box. To place an
    icon in the PDF: pick your stage rect's width/height in mm, map
    `position_x/100 * stageWidthMm` / `position_y/100 * stageHeightMm` for
    the center, and size the icon as `48/1000 * stageWidthMm *
    element.scale` (keep aspect ratio — the icons are square).
  - Since print always passes `isEditorMode={false}`, you can ignore: drag/
    drop, snap guides, the dashed grid lines (only rendered when
    `isEditorMode`), and the `isHighlighted`/`snapAnchors` visual states.
    That simplifies things a lot — you only need the *static render* path.
  - Elements are grouped by `group_id`; each group can have a
    `display_name` label rendered once, centered above the group's lowest
    element (see `GroupLabel` + the `processedGroups` memo for the exact
    positioning math — pixel-for-pixel port that logic, don't eyeball it).
  - One special case: `element.element_type_name === "Palco"` renders as a
    horizontal divider line (`StageLine.js`), not an icon — just
    `element.position_y`, a full-width line, no `image_url`. Everything
    else renders via `StageElement.js`.
- **`components/presentation/StageElement.js`** (142 lines) — renders one
  icon: `<Image src={element.image_url} fill unoptimized />` positioned/
  scaled per the math above. `image_url`/`image_url_highlight` come from
  `element_type` (see below) — **highlight never applies in print**
  (`loggedInUser` is always `null` there), so you only ever need
  `image_url`, never `image_url_highlight`.
- **Where the icons actually live**: `element_type.image_url` is *always* a
  local static path like `/images/pessoa-preto.svg`, `/images/koto-rosa.svg`,
  etc. — see `infra/migrations/1762464867219_seed-element-types.js` for the
  full seeded list, and `public/images/*.svg` for the actual files (~20
  icons, `retangulo-*`, `circulo-*`, various instrument names, `pessoa-*`,
  `stage-line.svg`, etc.). These are small, known, bundled files — not
  user-uploaded, not remote URLs. You can read them straight off disk
  (server-side) or `fetch()` them (client-side); either is fine since
  there's a small fixed set.
- **`src/hooks/usePresentationEditor.js`** (1426 lines) — the orchestration
  layer, all inside this one hook:
  - State: `isPrintModalOpen`, `printComments`, `printIsCompact`,
    `isLoadingPrint`, `componentToPrintRef` (a `useRef`, line ~87).
  - `openPrintModal`/`closePrintModal` (~1208–1215).
  - `handlePrintConfirm(pixelRatio)` (~1217–1234) — reads
    `componentToPrintRef.current`, builds a filename from
    `presentation.name`, calls `generatePDF(element, fileName,
    printIsCompact, pixelRatio)`.
  - `handleProcessPrint(comments, isCompact, pixelRatio)` (~1236–1247) —
    stores comments/compact-mode into state, closes the modal, then
    `setTimeout(() => handlePrintConfirm(pixelRatio), 1000)` — **this whole
    ref/setState/setTimeout dance exists only because the DOM needs to
    re-render and paint before `html-to-image` can screenshot it.** Once
    you're drawing the PDF programmatically from `presentation` data
    directly (like `generateSalesReportPdf` does — see how
    `usePdvAdmin.js`'s `handleExportReport` calls it synchronously, no ref,
    no timeout), this entire mechanism goes away. That's most of the
    simplification win here, same as it was for the sales report hook.
  - `handleDownloadPng` (~1249–1297) — **leave this alone**, it's the
    PNG export and stays raster/DOM-screenshot-based on purpose.
  - Exposed to the page as `printData: {comments, isCompact, isLoading}`,
    `printHandlers: {ref, onPrint}`, `modal: {isPrintOpen, closePrint,
    processPrint, processPng}`.
- **`components/presentation/PrintCommentModal.js`** (285 lines) — the modal
  that collects final comments, compact/detailed toggle, and a "quality"
  (`pixelRatio`, 1–5) selector before generating. Once generation no longer
  rasterizes anything, the quality/`pixelRatio` selector **stops making
  sense for the PDF button** (it's a screenshot-resolution knob) — it can
  stay for the "Gerar PNG" button (still raster) but should probably be
  removed from the "Gerar PDF" flow, or repurposed if you find another use
  for it. Use your judgment; this is a small UX cleanup, not the core of
  the task.
- **`pages/apresentacoes/[id].js`** — wiring. `onPrint` trigger around line
  230 (`AdminToolbar`'s `onPrint` prop → `editor.printHandlers.onPrint()`),
  `<PrintCommentModal>` around line 394, `<PrintablePresentation ref=...>`
  mounted around line 402.

## Recommended approach

1. **Prove the SVG piece works in isolation first** — it's the genuinely new
   risk here (the sales report never needed to draw anything but text/
   rects/lines). Add
   [`svg2pdf.js`](https://www.npmjs.com/package/svg2pdf.js) (`npm install
   svg2pdf.js` — compatible with this repo's `jspdf@3.0.4`, confirmed via
   `npm view svg2pdf.js peerDependencies` → `jspdf: "^4.0.0 || ^3.0.0 ||
   ^2.0.0"`). It draws real SVG paths into the PDF as vector graphics (not a
   raster embed), which is what actually delivers on "these are already
   SVGs, just draw them as SVGs." API shape:
   `import { svg2pdf } from "svg2pdf.js"; await svg2pdf(svgElement, pdf, {
   x, y, width, height })` — `svgElement` needs to be a parsed `SVGElement`
   (e.g. `new DOMParser().parseFromString(svgText, "image/svg+xml")
   .documentElement`), so you'll fetch each icon's raw SVG text once
   (there's a small fixed set — consider a `Map` cache keyed by URL so a
   scene with 20 performers doesn't refetch the same "pessoa-preto.svg" 20
   times) and parse it before calling `svg2pdf`.
2. **Port `FormationMap`'s static-render math** into a
   `drawFormationMap(pdf, { x, y, width, height, elements })` helper in the
   new util module — icon placement/sizing per the coordinate math above,
   group labels (rect + centered text, matching `GroupLabel`'s styling),
   and the `Palco` divider line special-case. This is the single most
   important helper in the whole task — the stage map *is* the content
   people care about.
3. Build the new `src/utils/generatePresentationPdf.js` (mirror
   `generateSalesReportPdf.js`'s shape: one exported function taking
   `{ presentation, comments, isCompact, fileName }`, small private helper
   functions above it, `pdf.save(fileName)` at the end). Port page-by-page:
   cover → per-formation pages (formation map + transitions side list, use
   `jspdf-autotable` or plain `pdf.text()`/`splitTextToSize()` for the
   transitions list, whichever reads cleaner) → final summary page. Then
   the compact single-page mode.
4. Rewire `usePresentationEditor.js`: replace `handlePrintConfirm`'s call to
   `generatePDF(ref, ...)` with a direct, synchronous call to
   `generatePresentationPdf({...})`, and delete the
   `componentToPrintRef`/`setTimeout` machinery for the PDF path (keep the
   ref only if `handleDownloadPng` still needs it — it does, so keep the
   ref itself, just stop routing the PDF path through it).
5. Delete `PrintablePresentation.js` **only if nothing else still needs the
   DOM version** — double-check `handleDownloadPng` doesn't need it kept
   around for the PNG path before removing it (it currently screenshots the
   exact same ref, so you may need to keep a slimmed-down version of that
   component alive for PNG, or decide PNG should also go away / change —
   that's a judgment call to make once you're in there, not something to
   pre-decide here).
6. Update/remove `PrintCommentModal.js`'s quality selector per the note
   above.

## Verification plan (reuse what worked this session)

- `npx prettier --check` / `next lint --file ...` on everything touched.
- No automated test suite covers PDF *rendering* (there isn't one for the
  sales report either) — verification is manual/visual:
  1. Seed a real presentation with a few scenes via the models directly
     (`models/presentation.js`, `models/scene.js`, `models/scene_element.js`,
     `models/element_type.js`, `models/element_group.js`,
     `models/transition_step.js`) in a throwaway `tests/tmp-seed-*.test.js`
     run via `npx jest ... --runInBand`, the same pattern used throughout
     this session — delete the tmp file after. Include at least one scene
     with several elements of different `element_type`s (so multiple SVG
     icons render), a group label, and a `Palco` line, plus at least 2
     FORMATION scenes with a transition scene between them so the
     "detailed" mode's per-page + side-panel logic gets exercised.
  2. Grab a session token for a user with presentation edit access the same
     way — `session.create(user)` — and drive the editor with Playwright
     (`chromium.launch({ args: ["--disable-dev-shm-usage", "--no-sandbox"]
     })` — see the gotcha below), click through to generate the PDF, and
     `download.saveAs(...)`.
  3. Inspect with `pdfinfo <file>.pdf` (page count, file size) and
     `pdftoppm -png -r 150 <file>.pdf page` then `Read` the resulting PNGs
     to actually look at each page. Compare against a screenshot of the
     *current* (pre-rewrite) output for the same seeded presentation so
     you're checking equivalence, not guessing.
  4. Clean up any seeded test data afterward (same discipline as the rest
     of this session — this is someone's real local dev database).

### Environment gotchas hit this session (save yourself the time)

- This container is memory-tight (~7.8GB total, often <2GB free). An
  orphaned duplicate `next-server`/`npm exec next dev` process (e.g. from a
  killed-but-not-fully-reaped earlier dev server) can eat 1GB+ RSS and cause
  Playwright's Chromium to get OOM-killed mid-run ("Page crashed" with no
  other explanation). If that happens: `ps aux | grep -E "next dev|next-
  server"`, kill any duplicates, and if `next dev` starts throwing `ENOENT:
  ... .next/server/pages/api/....js` afterward, `rm -rf .next` and restart
  it fresh rather than fighting a corrupted dev build cache.
- `jspdf-autotable` is already an installed dependency (added for the sales
  report work) — no need to re-add it if you end up using it here too.

## Explicit non-goals

- **No visual redesign, at all.** Not colors, not shape sizes, not spacing,
  not page layout. This is purely a file-format/rendering-technique
  optimization: stop pasting raster screenshots into the PDF, draw the same
  design as real SVG + vector text instead, to cut file size and gain
  quality/scalability. If today's output and the rewritten output don't
  look the same side by side, that's a bug in the rewrite, not an
  intentional improvement.
- No changes to the live in-editor `FormationMap` (drag/drop, snapping,
  editor mode) — only the print/export path changes.
- `handleDownloadPng` / "Gerar PNG" stays raster, untouched.
