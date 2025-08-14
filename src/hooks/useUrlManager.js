import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook para gerenciar a URL de forma centralizada
 * @param {Object} options - Opções de configuração
 * @param {string} options.paramName - Nome do parâmetro a ser gerenciado (padrão: "username")
 * @param {boolean} options.replace - Se deve usar replace ao invés de push (padrão: true)
 * @param {boolean} options.scroll - Se deve rolar a página após atualizar a URL (padrão: false)
 * @returns {Object} Objeto com funções para gerenciar a URL
 */
export default function useUrlManager() {
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Atualiza a URL com o valor do parâmetro
   * @param {string} value - Valor do parâmetro
   */
  const updateUrl = useCallback(
    (paramName, value, replace = true, scroll = false, shallow = true) => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);

      if (value && paramName && paramName !== "" && value !== "") {
        params.set(paramName, value);
      } else if (paramName && paramName !== "") {
        params.delete(paramName);
      }

      const url = `${pathname}?${params.toString()}`;

      if (replace) {
        router.replace(url, { scroll, shallow });
      } else {
        router.push(url, { scroll, shallow });
      }
    },
    [router, pathname],
  );

  /**
   * Atualiza múltiplos parâmetros da URL de uma vez
   * @param {Object} params - Objeto com os parâmetros e valores a serem atualizados
   * @param {boolean} replace - Se deve usar replace ao invés de push (padrão: true)
   * @param {boolean} scroll - Se deve rolar a página após atualizar a URL (padrão: false)
   */
  const updateMultipleUrl = useCallback(
    (params, replace = true, scroll = false, shallow = true) => {
      if (typeof window === "undefined") return;

      const urlParams = new URLSearchParams(window.location.search);

      Object.entries(params).forEach(([paramName, value]) => {
        if (value && paramName && paramName !== "" && value !== "") {
          urlParams.set(paramName, value);
        } else if (paramName && paramName !== "") {
          urlParams.delete(paramName);
        }
      });

      const url = `${pathname}?${urlParams.toString()}`;

      if (replace) {
        router.replace(url, { scroll, shallow });
      } else {
        router.push(url, { scroll, shallow });
      }
    },
    [router, pathname],
  );

  /**
   * Obtém o valor atual do parâmetro
   * @returns {string} Valor do parâmetro
   */
  const getParamValue = useCallback((paramName) => {
    if (typeof window === "undefined") return "";

    const currentParams = new URLSearchParams(window.location.search);
    return currentParams.get(paramName) || "";
  }, []);

  return {
    updateUrl,
    updateMultipleUrl,
    getParamValue,
  };
}
