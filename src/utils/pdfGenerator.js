import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { ServiceError } from "errors";

/**
 * Gera um PDF a partir de um elemento HTML (Ref).
 * @param {HTMLElement} elementRef - O elemento DOM raiz contendo as páginas.
 * @param {string} fileName - Nome do arquivo para download.
 * @param {boolean} isCompact - Se é modo compacto (apenas uma página) ou detalhado.
 */
export const generatePDF = async (
  elementRef,
  fileName = "apresentacao.pdf",
  isCompact = false,
) => {
  if (!elementRef) return;

  try {
    // Configuração A4 Paisagem (Landscape)
    // A4: 297mm x 210mm
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Função auxiliar para processar um nó DOM e adicionar ao PDF
    const addPageToPdf = async (domNode, isFirstPage = false) => {
      // Gera a imagem com alta qualidade (2x o tamanho para nitidez)
      const dataUrl = await toPng(domNode, {
        width: 1123, // Largura A4 aprox em px (96 DPI) - ajustável pelo pixelRatio
        height: 794,
        cacheBust: true,
        pixelRatio: 4,
        backgroundColor: "white",
        quality: 1.0,
        style: {
          visibility: "visible",
          position: "static",
          left: "0",
          top: "0",
          transform: "none",
          fontSmoothing: "antialiased",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "geometricPrecision",
          imageRendering: "high-quality",
        },
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (!isFirstPage) {
        pdf.addPage();
      }

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
    };

    if (isCompact) {
      // Modo Compacto: O elementoRef é a página inteira
      await addPageToPdf(elementRef, true);
    } else {
      // Modo Detalhado: Buscamos os filhos que representam páginas
      // Precisamos identificar os containers de página.
      // Vou assumir que no seu componente PrintablePresentation, cada página tem uma classe específica ou é um filho direto.
      // Vamos adicionar a classe 'pdf-page-container' no seu componente para facilitar.

      const pages = elementRef.querySelectorAll(".pdf-page-container");

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          await addPageToPdf(pages[i], i === 0);
        }
      } else {
        // Fallback se não achar containers: imprime tudo em uma página (ou ajusta lógica)
        await addPageToPdf(elementRef, true);
      }
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw new ServiceError({
      message: "Erro ao gerar PDF",
      cause: error,
    });
  }
};
