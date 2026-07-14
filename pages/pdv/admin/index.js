import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import PageLayout from "components/layouts/PageLayout";
import Loading from "components/Loading.js";
import Alert from "components/ui/Alert";
import ProductManagement from "components/pdv/admin/ProductManagement";
import PaymentMethodManagement from "components/pdv/admin/PaymentMethodManagement";
import SettingsForm from "components/pdv/admin/SettingsForm";
import SalesReport from "components/pdv/admin/SalesReport";
import { usePdvAdmin } from "src/hooks/usePdvAdmin";

export default function PdvAdminPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  const admin = usePdvAdmin();

  const permissions = useMemo(() => {
    const features = user?.features || [];
    return {
      canManageProducts: features.includes("pdv:products:manage"),
      canManagePaymentMethods: features.includes("pdv:payment_methods:manage"),
      canManageConfig: features.includes("pdv:config:manage"),
      canReadReports: features.includes("pdv:reports:read"),
      canCancelSales: features.includes("pdv:sales:cancel"),
    };
  }, [user]);

  const canAccessPage = Object.values(permissions).some(Boolean);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      setAuthError("Você precisa estar autenticado para acessar esta página.");
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 2000);
      return;
    }
    if (!canAccessPage) {
      setAuthError(
        "Você não tem permissão para acessar a administração do PDV.",
      );
      setTimeout(() => router.push(settings.global.REDIRECTS.HOME), 2000);
      return;
    }
    setShowContent(true);
  }, [user, isLoadingAuth, canAccessPage, router]);

  useEffect(() => {
    if (!showContent) return;
    // Produtos e formas de pagamento também alimentam os filtros do relatório,
    // então buscamos ambos se o usuário gerencia OU só lê relatórios.
    if (permissions.canManageProducts || permissions.canReadReports) {
      admin.fetchProducts();
    }
    if (permissions.canManagePaymentMethods || permissions.canReadReports) {
      admin.fetchPaymentMethods();
    }
    if (permissions.canManageConfig) {
      admin.fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContent, permissions]);

  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        {authError ? (
          <Alert type="error">{authError}</Alert>
        ) : (
          <Loading message="Verificando permissões..." />
        )}
      </div>
    );
  }

  return (
    <PageLayout
      title="PDV - Administração"
      description="Administração do ponto de venda"
      maxWidth="max-w-7xl"
    >
      <div>
        <h2 className="mt-16 text-center text-3xl font-extrabold text-gray-900">
          Administração do PDV
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Produtos, formas de pagamento, configurações e relatório de vendas.
        </p>
      </div>

      {(admin.error || admin.success) && (
        <div className="mt-8">
          {admin.error && <Alert type="error">{admin.error}</Alert>}
          {admin.success && <Alert type="success">{admin.success}</Alert>}
        </div>
      )}

      {permissions.canManageProducts && (
        <ProductManagement
          products={admin.products}
          isLoading={admin.isLoadingProducts}
          onCreate={admin.createProduct}
          onUpdate={admin.updateProduct}
          onRemove={admin.removeProduct}
          onHardDelete={admin.hardDeleteProduct}
          onCheckInUse={admin.checkProductInUse}
          onAdjustStock={admin.adjustProductStock}
        />
      )}

      {permissions.canManagePaymentMethods && (
        <PaymentMethodManagement
          paymentMethods={admin.paymentMethods}
          isLoading={admin.isLoadingPaymentMethods}
          onCreate={admin.createPaymentMethod}
          onUpdate={admin.updatePaymentMethod}
          onRemove={admin.removePaymentMethod}
          onHardDelete={admin.hardDeletePaymentMethod}
          onCheckMethodInUse={admin.checkPaymentMethodInUse}
          onCreateVariant={admin.createVariant}
          onRemoveVariant={admin.removeVariant}
          onCheckVariantInUse={admin.checkVariantInUse}
        />
      )}

      {permissions.canManageConfig && (
        <SettingsForm
          pdvSettings={admin.pdvSettings}
          isLoading={admin.isLoadingSettings}
          onUpdate={admin.updateSettings}
        />
      )}

      {permissions.canReadReports && (
        <SalesReport
          report={admin.report}
          isLoading={admin.isLoadingReport}
          products={admin.products}
          paymentMethods={admin.paymentMethods}
          canCancel={permissions.canCancelSales}
          onFetch={admin.fetchReport}
          onCancelSale={admin.cancelSale}
          isExportModalOpen={admin.isExportModalOpen}
          isExportingReport={admin.isExportingReport}
          onOpenExport={admin.openExportModal}
          onCloseExport={admin.closeExportModal}
          onConfirmExport={admin.handleExportReport}
        />
      )}
    </PageLayout>
  );
}
