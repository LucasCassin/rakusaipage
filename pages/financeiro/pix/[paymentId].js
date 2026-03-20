import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import PageLayout from "components/layouts/PageLayout";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import CopyButton from "components/ui/CopyButton";
import FormInput from "components/forms/FormInput";
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
  const [copySuccess, setCopySuccess] = useState(false);

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
  const pixCode = pixInfo?.qr_code || pixInfo?.qr_code_base64;

  const copyPixCode = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (copyErr) {
      console.error("Erro ao copiar código PIX:", copyErr);
    }
  };

  return (
    <PageLayout
      title="Pagamento PIX"
      description="Acompanhe o status do seu pagamento via PIX"
    >
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="rounded-lg border border-blue-100 bg-white shadow-lg p-6 mt-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Pagamento PIX
            </h1>
            <p className="text-sm text-gray-500 mt-1">ID: {payment.id}</p>
          </div>
          <div className="mt-4 text-sm space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase">Plano</p>
              <p className="text-base font-bold text-gray-900">
                {payment.plan_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Valor</p>
              <p className="text-base font-bold text-gray-900">
                R$ {Number(payment.amount_due).toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Vencimento</p>
              <p className="text-sm text-gray-700">
                {new Date(payment.due_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Status</p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                  statusInfo?.color === "green"
                    ? "bg-emerald-500"
                    : statusInfo?.color === "red"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                }`}
                style={{ height: "1.3rem" }}
              >
                {statusInfo?.label}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <p>
                Última atualização:{" "}
                {lastUpdatedAt
                  ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR")
                  : "-"}
              </p>
              {payment.status !== "CONFIRMED" ? (
                <p>Nova tentativa em {timer}s</p>
              ) : (
                <p>&nbsp;</p>
              )}
            </div>
          </div>
        </div>

        {pixInfo ? (
          <div className="rounded-lg border border-blue-100 bg-white shadow-lg p-6">
            <div className="flex justify-center mb-3">
              <span className="text-xs text-gray-500 text-center max-w-md">
                Scaneie o QR Code com o aplicativo do seu banco ou copie o
                código e cole na área de pagamento por PIX.
              </span>
            </div>
            <div className="flex justify-center">
              {pixInfo.qr_code_base64 || pixInfo.qr_code ? (
                <img
                  src={`data:image/png;base64,${pixInfo.qr_code_base64 || pixInfo.qr_code}`}
                  alt="QR Code PIX"
                  className="w-full max-w-md object-contain rounded-lg p-2"
                />
              ) : (
                <p>Código não disponível.</p>
              )}
            </div>

            {pixCode && (
              <div className="w-full">
                <div className="flex w-full">
                  <div className="relative flex-grow">
                    <FormInput
                      id="pix-code"
                      type="text"
                      value={pixCode}
                      onChange={() => {}}
                      disabled
                      className="w-full max-w-md rounded-r-none h-11"
                      rightElement={
                        <div className="flex-shrink-0">
                          <CopyButton
                            onClick={copyPixCode}
                            texts="Copiar código PIX"
                            disabled={false}
                            className="h-11"
                          />
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {pixInfo.ticket_url && (
              <div className="mt-3 flex justify-center">
                {copySuccess ? (
                  <p className="text-xs text-green-600">
                    Código copiado para área de transferência.
                  </p>
                ) : (
                  <a
                    className="text-blue-600 hover:underline"
                    href={pixInfo.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir comprovante no Mercado Pago
                  </a>
                )}
              </div>
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

        <div className="mt-3 text-xs text-gray-500 text-center">
          Transação processada via Mercado Pago (pagamento seguro e monitorado).
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Button
            onClick={() => router.push("/financeiro")}
            variant="secondary"
            size="small"
            className="w-full max-w-md"
          >
            Voltar
          </Button>

          {payment.status === "CONFIRMED" && (
            <Button
              onClick={() => router.push("/financeiro")}
              variant="primary"
              size="large"
              className="w-full max-w-md"
            >
              Ir para financeiro
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
