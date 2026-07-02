import { useState } from "react";
import { useAuth } from "src/contexts/AuthContext.js";
import PageLayout from "components/layouts/PageLayout";
import Loading from "components/Loading.js";
import Alert from "components/ui/Alert";
import ProductPalette from "components/pdv/ProductPalette";
import Cart from "components/pdv/Cart";
import DiscountModal from "components/pdv/DiscountModal";
import PaymentModal from "components/pdv/PaymentModal";
import { usePdvCashier } from "src/hooks/usePdvCashier";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

export default function PdvCashierPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const cashier = usePdvCashier();

  const [checkoutStep, setCheckoutStep] = useState(null); // null | "discount" | "payment"
  const [lastSaleMessage, setLastSaleMessage] = useState(null);

  const canSell = user?.features?.includes("pdv:sell");

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Loading message="Verificando permissões..." />
      </div>
    );
  }

  if (!user || !canSell) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert type="error">
          Você não tem permissão para acessar o caixa do PDV.
        </Alert>
      </div>
    );
  }

  // Estimativa client-side apenas para exibição — o valor final (com piso e
  // teto de desconto aplicados) sempre vem da resposta do backend.
  const estimatedDiscountInCents = (() => {
    if (!cashier.discount.type || !cashier.discount.value) return 0;
    if (cashier.discount.type === "percentage") {
      return Math.round(
        cashier.subtotalInCents * (cashier.discount.value / 100),
      );
    }
    return cashier.discount.value;
  })();
  const estimatedTotalInCents = Math.max(
    0,
    cashier.subtotalInCents - estimatedDiscountInCents,
  );

  const handleCheckout = () => {
    setLastSaleMessage(null);
    setCheckoutStep("discount");
  };

  const handleDiscountConfirm = (type, value) => {
    cashier.applyDiscount(type, value);
    setCheckoutStep("payment");
  };

  const handlePaymentConfirm = async ({
    paymentMethodId,
    paymentMethodVariantId,
    cashGivenInCents,
    notes,
  }) => {
    const data = await cashier.submitSale({
      paymentMethodId,
      paymentMethodVariantId,
      cashGivenInCents,
      notes,
    });

    if (data) {
      setCheckoutStep(null);
      setLastSaleMessage(
        `Venda #${data.sale_number} concluída — Total ${formatCurrencyInCents(data.total_in_cents)}` +
          (data.change_in_cents
            ? ` — Troco ${formatCurrencyInCents(data.change_in_cents)}`
            : ""),
      );
    }
  };

  return (
    <PageLayout
      title="PDV - Caixa"
      description="Ponto de venda do Rakusai Taiko"
      maxWidth="max-w-7xl"
      showInitialLoading={false}
    >
      <h2 className="mt-8 text-center text-3xl font-extrabold text-gray-900">
        Caixa PDV
      </h2>

      {lastSaleMessage && (
        <div className="mt-4">
          <Alert type="success">{lastSaleMessage}</Alert>
        </div>
      )}
      {cashier.error && checkoutStep !== "payment" && (
        <div className="mt-4">
          <Alert type="error">{cashier.error}</Alert>
        </div>
      )}

      {cashier.isLoadingCatalog ? (
        <Loading message="Carregando catálogo..." />
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[65vh]">
            <ProductPalette
              products={cashier.products}
              onAddItem={cashier.addItem}
            />
          </div>
          <div className="lg:col-span-1 h-[65vh]">
            <Cart
              items={cashier.cartItems}
              subtotalInCents={cashier.subtotalInCents}
              onIncrement={cashier.incrementItem}
              onDecrement={cashier.decrementItem}
              onRemove={cashier.removeItem}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      )}

      {checkoutStep === "discount" && (
        <DiscountModal
          subtotalInCents={cashier.subtotalInCents}
          onClose={() => setCheckoutStep(null)}
          onConfirm={handleDiscountConfirm}
        />
      )}

      {checkoutStep === "payment" && (
        <PaymentModal
          totalInCents={estimatedTotalInCents}
          paymentMethods={cashier.paymentMethods}
          isSubmitting={cashier.isSubmitting}
          error={cashier.error}
          onClose={() => setCheckoutStep(null)}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </PageLayout>
  );
}
