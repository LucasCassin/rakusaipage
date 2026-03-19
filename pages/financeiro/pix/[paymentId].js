import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import PageLayout from "components/layouts/PageLayout";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings";

export default function PixPaymentPage() {
  const router = useRouter();
  const { paymentId } = router.query;
  const { user, isLoading: isLoadingAuth } = useAuth();

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [timer, setTimer] = useState(60);

  const fetchCurrentPayment = async () => {
    if (!user?.username || !paymentId) return;
    setError(null);

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PAYMENTS}?username=${user.username}`,
      );
      if (!response.ok) {
        throw new Error("Erro ao buscar pagamento.");
      }
      const payments = await response.json();
      const found = payments.find((p) => p.id === paymentId);
      if (!found) {
        setError("Pagamento não encontrado.");
        return;
      }
      setPayment(found);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err.message || "Erro ao buscar o pagamento.");
    }
  };

  useEffect(() => {
    if (!user || !paymentId) return;
    fetchCurrentPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, paymentId]);

  useEffect(() => {
    if (!payment || payment.status !== "CONFIRMED") return;
    const timerId = setTimeout(() => {
      router.push("/financeiro");
    }, 1000);
    return () => clearTimeout(timerId);
  }, [payment, router]);

  useEffect(() => {
    if (!payment) return;

    let localTimer = 60;
    setTimer(localTimer);

    const interval = setInterval(() => {
      localTimer = localTimer > 0 ? localTimer - 1 : 0;
      setTimer(localTimer);

      if (localTimer === 0) {
        fetchCurrentPayment();
        localTimer = 60;
        setTimer(localTimer);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, user, payment]);

  const statusInfo = useMemo(() => {
    if (!payment) return null;
    if (payment.status === "CONFIRMED") {
      return {
        label: "Pago",
        color: "green",
      };
    }
    if (payment.status === "OVERDUE") {
      return {
        label: "Atrasado",
        color: "red",
      };
    }
    return {
      label: "Pendente",
      color: "yellow",
    };
  }, [payment]);

  if (isLoadingAuth || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading message="Verificando usuário..." />
      </div>
    );
  }

  if (!payment) {
    return (
      <PageLayout title="Pagamento PIX" description="Aguardar pagamento">
        <div className="max-w-2xl mx-auto p-4">
          {error ? (
            <Alert type="error">{error}</Alert>
          ) : (
            <Loading message="Carregando pagamento..." />
          )}
        </div>
      </PageLayout>
    );
  }

  const gatewayData =
    payment.payment_gateway_data || payment.gateway_data || {};
  const pixInfo =
    gatewayData.qr_code_base64 || gatewayData.qr_code || gatewayData.ticket_url
      ? gatewayData
      : null;

  return (
    <PageLayout
      title="Pagamento PIX"
      description="Acompanhe o status do seu pagamento via PIX"
    >
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="rounded-md border p-4">
          <h1 className="text-2xl font-bold">Pagamento {payment.id}</h1>
          <p className="text-sm text-gray-500">Plano: {payment.plan_name}</p>
          <p className="text-lg">
            Valor: R$ {Number(payment.amount_due).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Vencimento: {new Date(payment.due_date).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-sm text-gray-600">
            Status: <strong>{statusInfo?.label}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Última atualização:{" "}
            {lastUpdatedAt
              ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR")
              : "-"}
          </p>
          {payment.status !== "CONFIRMED" && (
            <p className="text-sm text-blue-600 mt-2">
              Atualizando automaticamente. Nova tentativa em: {timer}s
            </p>
          )}
        </div>

        {pixInfo ? (
          <div className="rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-2">QR Code PIX</h2>
            {pixInfo.qr_code_base64 ? (
              <img
                src={pixInfo.qr_code_base64}
                alt="QR Code PIX"
                className="mx-auto"
              />
            ) : pixInfo.qr_code ? (
              <img
                src={`data:image/png;base64,${pixInfo.qr_code}`}
                alt="QR Code PIX"
                className="mx-auto"
              />
            ) : (
              <p>Código não disponível.</p>
            )}
            {pixInfo.qr_code && (
              <div className="mt-4">
                <p className="text-sm font-medium">Código PIX:</p>
                <textarea
                  readOnly
                  rows={4}
                  className="w-full rounded border p-2 mt-1"
                  value={pixInfo.qr_code}
                />
              </div>
            )}
            {pixInfo.ticket_url && (
              <p className="mt-2 text-sm">
                Link do comprovante:{" "}
                <a className="text-blue-600" href={pixInfo.ticket_url}>
                  {pixInfo.ticket_url}
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border p-4 bg-yellow-50">
            <p className="text-sm text-yellow-800">
              Não foi encontrado QR Code PIX no pagamento. Aguarde o status ser
              retornado pelo gateway ou gere novamente.
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <button
            className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200"
            onClick={() => router.push("/financeiro")}
          >
            Voltar
          </button>

          {payment.status === "CONFIRMED" && (
            <button
              className="px-4 py-2 border rounded-md bg-green-400 text-white hover:bg-green-500"
              onClick={() => router.push("/financeiro")}
            >
              Pagamento reconhecido, ir ao financeiro
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
