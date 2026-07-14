import { svg2pdf } from "svg2pdf.js";

/**
 * Draws a static, local SVG file (the presentation's ~20 stage icons, plus
 * the cover-page logo/glyphs) directly into a jsPDF document as real vector
 * paths, instead of rasterizing it.
 */

const svgTextCache = new Map();

async function getSvgText(url) {
  if (!svgTextCache.has(url)) {
    svgTextCache.set(
      url,
      fetch(url).then((response) => response.text()),
    );
  }
  return svgTextCache.get(url);
}

/**
 * svg2pdf.js only reads a gradient's own direct <stop> children — it doesn't
 * resolve stops inherited via xlink:href from another gradient (a common
 * Inkscape export pattern). Inline the referenced stops so gradient fills
 * that rely on this still render.
 */
function resolveGradientStopInheritance(svgElement) {
  svgElement
    .querySelectorAll("linearGradient, radialGradient")
    .forEach((gradient) => {
      if (gradient.children.length > 0) return;
      const href =
        gradient.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
        gradient.getAttribute("href");
      if (!href) return;
      const source = svgElement.querySelector(href);
      if (!source) return;
      Array.from(source.children).forEach((stop) => {
        gradient.appendChild(stop.cloneNode(true));
      });
    });
}

export async function drawSvgIcon(pdf, url, { x, y, width, height }) {
  const svgText = await getSvgText(url);
  const svgElement = new DOMParser().parseFromString(
    svgText,
    "image/svg+xml",
  ).documentElement;
  resolveGradientStopInheritance(svgElement);
  await svg2pdf(svgElement, pdf, { x, y, width, height });
}
