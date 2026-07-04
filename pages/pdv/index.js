import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { useAuth } from "src/contexts/AuthContext.js";
import PageLayout from "components/layouts/PageLayout";
import Loading from "components/Loading.js";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import ProductPalette from "components/pdv/ProductPalette";
import Cart from "components/pdv/Cart";
import DiscountModal from "components/pdv/DiscountModal";
import PaymentModal from "components/pdv/PaymentModal";
import { usePdvCashier } from "src/hooks/usePdvCashier";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";
import {
  calculatePdvDiscount,
  PDV_DISCOUNT_CAP_LABELS,
} from "src/utils/calculatePdvDiscount";

export default function PdvCashierPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const cashier = usePdvCashier();

  const [checkoutStep, setCheckoutStep] = useState(null); // null | "discount" | "payment"
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [lastSaleMessage, setLastSaleMessage] = useState(null);

  // A mensagem de venda concluída some sozinha após alguns segundos.
  useEffect(() => {
    if (!lastSaleMessage) return;
    const timer = setTimeout(() => setLastSaleMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [lastSaleMessage]);

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

  // Estimativa client-side apenas para exibição — usa a mesma fórmula do
  // backend (`calculatePdvDiscount`) para que o total mostrado ao vendedor já
  // saia com piso e teto de desconto aplicados; o valor que de fato fecha a
  // venda ainda vem, na prática, da resposta do backend.
  const { discountInCents: estimatedDiscountInCents, cappedBy } =
    cashier.pdvSettings
      ? calculatePdvDiscount({
          subtotalInCents: cashier.subtotalInCents,
          totalMinimumFloorInCents: cashier.totalMinimumFloorInCents,
          discountType: cashier.discount.type,
          discountValue: cashier.discount.value,
          settings: cashier.pdvSettings,
        })
      : { discountInCents: 0, cappedBy: null };
  const estimatedTotalInCents = Math.max(
    0,
    cashier.subtotalInCents - estimatedDiscountInCents,
  );
  const discountCapMessage = cappedBy
    ? `Desconto limitado ${PDV_DISCOUNT_CAP_LABELS[cappedBy]}.`
    : null;

  const handleCheckout = () => {
    setLastSaleMessage(null);
    setIsCartModalOpen(false);
    setCheckoutStep("discount");
  };

  const handleDiscountConfirm = (type, value) => {
    cashier.applyDiscount(type, value);
    setCheckoutStep("payment");
  };

  const handlePaymentConfirm = async ({ payments, notes }) => {
    const data = await cashier.submitSale({ payments, notes });

    if (data) {
      setCheckoutStep(null);
      setIsCartModalOpen(false);
      setLastSaleMessage(
        `Venda #${data.sale_number} concluída — Total ${formatCurrencyInCents(data.total_in_cents)}`,
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
        <div className="mt-6 pb-24 lg:pb-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 lg:h-[65vh]">
            <ProductPalette
              products={cashier.products}
              onAddItem={cashier.addItem}
            />
          </div>
          <div className="hidden lg:block lg:col-span-1 h-[65vh]">
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

      {cashier.cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">
              {cashier.cartItems.length}{" "}
              {cashier.cartItems.length === 1 ? "item" : "itens"}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrencyInCents(cashier.subtotalInCents)}
            </p>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={() => setIsCartModalOpen(true)}
          >
            Ver Carrinho
          </Button>
        </div>
      )}

      {isCartModalOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center bg-black bg-opacity-50 p-0"
          style={{ margin: 0 }}
        >
          <div className="bg-white rounded-t-lg w-full h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Carrinho</h3>
              <button onClick={() => setIsCartModalOpen(false)}>
                <FiX className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4">
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
        </div>
      )}

      {checkoutStep === "discount" && (
        <DiscountModal
          subtotalInCents={cashier.subtotalInCents}
          totalMinimumFloorInCents={cashier.totalMinimumFloorInCents}
          pdvSettings={cashier.pdvSettings}
          onClose={() => setCheckoutStep(null)}
          onConfirm={handleDiscountConfirm}
        />
      )}

      {checkoutStep === "payment" && (
        <PaymentModal
          totalInCents={estimatedTotalInCents}
          discountCapMessage={discountCapMessage}
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
