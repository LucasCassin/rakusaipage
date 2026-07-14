import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { settings } from "config/settings.js";
import { useMessage } from "./useMessage";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { generateSalesReportPdf } from "src/utils/generateSalesReportPdf.js";

// Limite generoso pra trazer TODAS as vendas do período na exportação em
// PDF, em vez do limite de 20 usado na tabela paginada da tela.
const EXPORT_SALES_LIMIT = 5000;

/**
 * Hook do painel administrativo do PDV: CRUD de produtos, formas de
 * pagamento/variantes, configurações, relatório de vendas e cancelamento.
 */
export function usePdvAdmin() {
  const router = useRouter();
  const { error, setError, success, setSuccess, clearAll } = useMessage();

  // As mensagens de topo (erro/sucesso) somem sozinhas após alguns segundos,
  // em vez de ficarem na tela até a próxima ação.
  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => clearAll(), 3000);
    return () => clearTimeout(timer);
  }, [error, success, clearAll]);

  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  const [pdvSettings, setPdvSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const [report, setReport] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);

  const withHandling = useCallback(
    async (fn, successMessage) => {
      clearAll();
      try {
        const result = await fn();
        if (result && successMessage) {
          setSuccess(successMessage);
        }
        return result;
      } catch (err) {
        setError("Ocorreu um erro inesperado.");
        console.error(err);
        return null;
      }
    },
    [clearAll, setSuccess, setError],
  );

  // --- Produtos ---
  const fetchProducts = useCallback(
    async (query = {}) => {
      setIsLoadingProducts(true);
      const params = new URLSearchParams({ limit: 100, ...query });
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_PRODUCTS}?${params.toString()}`,
      );
      const data = await handleApiResponse({ response, router, setError });
      if (data) setProducts(data.products || []);
      setIsLoadingProducts(false);
      return data;
    },
    [router, setError],
  );

  const createProduct = useCallback(
    (productData) =>
      withHandling(async () => {
        const response = await fetch(
          settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchProducts();
        return data;
      }, "Produto criado com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  const updateProduct = useCallback(
    (id, productData) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN}/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchProducts();
        return data;
      }, "Produto atualizado com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  const removeProduct = useCallback(
    (id) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN}/${id}`,
          { method: "DELETE" },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchProducts();
        return data;
      }, "Produto inativado com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  const hardDeleteProduct = useCallback(
    (id) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN}/${id}?hard=true`,
          { method: "DELETE" },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchProducts();
        return data;
      }, "Produto excluído com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  // Checagem silenciosa usada pelo modal de exclusão — se a chamada falhar,
  // assume que está em uso para não liberar uma exclusão que não pôde ser
  // verificada.
  const checkProductInUse = useCallback(async (id) => {
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN}/${id}/usage`,
      );
      if (!response.ok) return true;
      const data = await response.json();
      return Boolean(data.in_use);
    } catch {
      return true;
    }
  }, []);

  const adjustProductStock = useCallback(
    (id, deltaQuantity) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PRODUCTS_ADMIN}/${id}/stock`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delta_quantity: deltaQuantity }),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchProducts();
        return data;
      }, "Estoque ajustado com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  // --- Formas de pagamento ---
  const fetchPaymentMethods = useCallback(async () => {
    setIsLoadingPaymentMethods(true);
    const response = await fetch(
      `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS}?include_inactive=true`,
    );
    const data = await handleApiResponse({ response, router, setError });
    if (data) setPaymentMethods(data);
    setIsLoadingPaymentMethods(false);
    return data;
  }, [router, setError]);

  const createPaymentMethod = useCallback(
    (name) =>
      withHandling(async () => {
        const response = await fetch(
          settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Forma de pagamento criada com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  const updatePaymentMethod = useCallback(
    (id, paymentMethodData) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentMethodData),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Forma de pagamento atualizada com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  const removePaymentMethod = useCallback(
    (id) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/${id}`,
          { method: "DELETE" },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Forma de pagamento inativada com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  const hardDeletePaymentMethod = useCallback(
    (id) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/${id}?hard=true`,
          { method: "DELETE" },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Forma de pagamento excluída com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  const checkPaymentMethodInUse = useCallback(async (id) => {
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/${id}/usage`,
      );
      if (!response.ok) return true;
      const data = await response.json();
      return Boolean(data.in_use);
    } catch {
      return true;
    }
  }, []);

  const checkVariantInUse = useCallback(async (variantId) => {
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/variants/${variantId}/usage`,
      );
      if (!response.ok) return true;
      const data = await response.json();
      return Boolean(data.in_use);
    } catch {
      return true;
    }
  }, []);

  const createVariant = useCallback(
    (paymentMethodId, name) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/${paymentMethodId}/variants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Variante criada com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  const removeVariant = useCallback(
    (variantId) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS_ADMIN}/variants/${variantId}`,
          { method: "DELETE" },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) await fetchPaymentMethods();
        return data;
      }, "Variante removida com sucesso."),
    [withHandling, router, setError, fetchPaymentMethods],
  );

  // --- Configurações ---
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    const response = await fetch(settings.global.API.ENDPOINTS.PDV_SETTINGS);
    const data = await handleApiResponse({ response, router, setError });
    if (data) setPdvSettings(data);
    setIsLoadingSettings(false);
    return data;
  }, [router, setError]);

  const updateSettings = useCallback(
    (settingsData) =>
      withHandling(async () => {
        const response = await fetch(
          settings.global.API.ENDPOINTS.PDV_SETTINGS,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settingsData),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        if (data) setPdvSettings(data);
        return data;
      }, "Configurações atualizadas com sucesso."),
    [withHandling, router, setError],
  );

  // --- Relatório ---
  const fetchReport = useCallback(
    async (filters = {}) => {
      setIsLoadingReport(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value);
        }
      });
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_SALES_REPORT}?${params.toString()}`,
      );
      const data = await handleApiResponse({ response, router, setError });
      if (data) setReport(data);
      setIsLoadingReport(false);
      return data;
    },
    [router, setError],
  );

  // Mesma busca do relatório, mas sem tocar em `report`/`isLoadingReport` —
  // usada pela exportação em PDF, que às vezes precisa de um `limit` bem
  // maior (todas as vendas do período) sem sobrescrever a tabela paginada
  // que está na tela.
  const fetchReportForExport = useCallback(
    async (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value);
        }
      });
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PDV_SALES_REPORT}?${params.toString()}`,
      );
      return handleApiResponse({ response, router, setError });
    },
    [router, setError],
  );

  const openExportModal = useCallback(() => setIsExportModalOpen(true), []);
  const closeExportModal = useCallback(() => setIsExportModalOpen(false), []);

  // O PDF é desenhado diretamente (texto/tabelas vetoriais via jsPDF), então
  // não depende de nenhum componente escondido re-renderizar antes de
  // capturar — só busca os dados certos e desenha na hora.
  const handleExportReport = useCallback(
    async (title, includeAnalytic, filters) => {
      setIsExportingReport(true);
      setIsExportModalOpen(false);

      let dataForExport = report;
      if (includeAnalytic) {
        dataForExport = await fetchReportForExport({
          ...filters,
          limit: EXPORT_SALES_LIMIT,
          include_items: "true",
        });
        if (!dataForExport) {
          setIsExportingReport(false);
          return;
        }
      }

      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      try {
        generateSalesReportPdf({
          report: dataForExport,
          title,
          includeAnalytic,
          fileName: `relatorio-vendas${slug ? `-${slug}` : ""}.pdf`,
        });
      } catch {
        setError("Não foi possível gerar o PDF do relatório.");
      }
      setIsExportingReport(false);
    },
    [report, fetchReportForExport, setError],
  );

  // --- Cancelamento de vendas ---
  const cancelSale = useCallback(
    (saleId, reason) =>
      withHandling(async () => {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PDV_SALES}/${saleId}/cancel`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        const data = await handleApiResponse({ response, router, setError });
        // O cancelamento devolve estoque — atualiza a tabela de produtos.
        if (data) await fetchProducts();
        return data;
      }, "Venda cancelada com sucesso."),
    [withHandling, router, setError, fetchProducts],
  );

  return {
    error,
    success,
    clearAll,

    products,
    isLoadingProducts,
    fetchProducts,
    createProduct,
    updateProduct,
    removeProduct,
    hardDeleteProduct,
    checkProductInUse,
    adjustProductStock,

    paymentMethods,
    isLoadingPaymentMethods,
    fetchPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    hardDeletePaymentMethod,
    checkPaymentMethodInUse,
    createVariant,
    removeVariant,
    checkVariantInUse,

    pdvSettings,
    isLoadingSettings,
    fetchSettings,
    updateSettings,

    report,
    isLoadingReport,
    fetchReport,

    isExportModalOpen,
    isExportingReport,
    openExportModal,
    closeExportModal,
    handleExportReport,

    cancelSale,
  };
}
