import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { settings } from "config/settings.js";
import { useMessage } from "./useMessage";
import { handleApiResponse } from "src/utils/handleApiResponse";

/**
 * Hook da tela do caixa do PDV: catálogo, carrinho local, desconto,
 * forma de pagamento e envio da venda.
 */
export function usePdvCashier() {
  const router = useRouter();
  const { error, setError, clearError } = useMessage();

  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState({ type: null, value: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const [productsRes, paymentMethodsRes] = await Promise.all([
        fetch(`${settings.global.API.ENDPOINTS.PDV_PRODUCTS}?limit=200`),
        fetch(settings.global.API.ENDPOINTS.PDV_PAYMENT_METHODS),
      ]);

      const productsData = await handleApiResponse({
        response: productsRes,
        router,
        setError,
      });
      const paymentMethodsData = await handleApiResponse({
        response: paymentMethodsRes,
        router,
        setError,
      });

      if (productsData) setProducts(productsData.products || []);
      if (paymentMethodsData) setPaymentMethods(paymentMethodsData || []);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [router, setError]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const addItem = useCallback((product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price_in_cents: product.price_in_cents,
          quantity: 1,
        },
      ];
    });
  }, []);

  const incrementItem = useCallback((productId) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  }, []);

  const decrementItem = useCallback((productId) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems((prev) =>
      prev.filter((item) => item.product_id !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setDiscount({ type: null, value: null });
  }, []);

  const subtotalInCents = useMemo(
    () =>
      cartItems.reduce(
        (acc, item) => acc + item.unit_price_in_cents * item.quantity,
        0,
      ),
    [cartItems],
  );

  const applyDiscount = useCallback((type, value) => {
    setDiscount({ type: type || null, value: value ?? null });
  }, []);

  // Recebe os dados de pagamento diretamente (em vez de ler de um estado
  // separado) para não depender do timing assíncrono de setState entre o
  // modal de pagamento e o envio da venda.
  const submitSale = useCallback(
    async ({
      paymentMethodId,
      paymentMethodVariantId,
      cashGivenInCents,
      notes,
    }) => {
      if (cartItems.length === 0) {
        setError("Adicione ao menos um item ao carrinho.");
        return null;
      }
      if (!paymentMethodId) {
        setError("Selecione uma forma de pagamento.");
        return null;
      }

      setIsSubmitting(true);
      clearError();

      try {
        const response = await fetch(settings.global.API.ENDPOINTS.PDV_SALES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
            })),
            discount_type: discount.type || undefined,
            discount_value: discount.value ?? undefined,
            payment_method_id: paymentMethodId,
            payment_method_variant_id: paymentMethodVariantId || undefined,
            cash_given_in_cents: cashGivenInCents ?? undefined,
            notes: notes || undefined,
          }),
        });

        const data = await handleApiResponse({ response, router, setError });

        if (data) {
          setLastSale(data);
          clearCart();
          fetchCatalog();
        }

        return data;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      cartItems,
      discount,
      router,
      setError,
      clearError,
      clearCart,
      fetchCatalog,
    ],
  );

  return {
    products,
    paymentMethods,
    isLoadingCatalog,
    cartItems,
    subtotalInCents,
    discount,
    isSubmitting,
    lastSale,
    error,
    clearError,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    applyDiscount,
    submitSale,
  };
}
