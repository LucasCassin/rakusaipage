import React, { useEffect, useState, useMemo, useRef } from "react";
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
  const [timer, setTimer] = useState(30);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const hasAttemptedAutoGenerate = useRef(false);

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
    if (!isLoadingAuth && !user) {
      router.push("/login");
    }
  }, [isLoadingAuth, user, router]);

  useEffect(() => {
    if (!payment || payment.status === "PENDING") return;

    const delay = payment.status === "CONFIRMED" ? 10000 : 800;
    const timerId = setTimeout(() => {
      router.push("/financeiro");
    }, delay);
    return () => clearTimeout(timerId);
  }, [payment, router]);

  useEffect(() => {
    if (!payment || payment.status !== "PENDING") return;

    let localTimer = 30;
    setTimer(localTimer);

    const interval = setInterval(() => {
      localTimer = localTimer > 0 ? localTimer - 1 : 0;
      setTimer(localTimer);

      if (localTimer === 0) {
        fetchCurrentPayment();
        localTimer = 30;
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

  const gatewayData =
    payment?.payment_gateway_data || payment?.gateway_data || {};

  const mpTransactionData =
    gatewayData.point_of_interaction?.transaction_data || {};

  const qrCodeBase64 =
    mpTransactionData.qr_code_base64 || gatewayData.qr_code_base64;
  const qrCode = mpTransactionData.qr_code || gatewayData.qr_code;
  const ticketUrl = mpTransactionData.ticket_url || gatewayData.ticket_url;

  // Extrai a expiração e verifica se já passou do tempo
  let dateOfExpiration =
    gatewayData.date_of_expiration || gatewayData.expiration_date;

  // Fallback: se o MP não retornar ou o backend não salvar a data de expiração,
  // o padrão do PIX no Mercado Pago é expirar em 24h. Usamos o "updated_at" do pagamento para o cálculo.
  if (
    !dateOfExpiration &&
    (qrCodeBase64 || qrCode || ticketUrl) &&
    payment?.updated_at
  ) {
    const generatedAt = new Date(payment.updated_at);
    dateOfExpiration = new Date(
      generatedAt.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
  }
  const isPixExpired = dateOfExpiration
    ? new Date(dateOfExpiration) <= new Date()
    : false;

  const pixInfo =
    (qrCodeBase64 || qrCode || ticketUrl) && !isPixExpired
      ? {
          qr_code_base64: qrCodeBase64,
          qr_code: qrCode,
          ticket_url: ticketUrl,
          date_of_expiration: dateOfExpiration,
        }
      : null;

  const pixCode = qrCode || qrCodeBase64;

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

  const handleGeneratePix = async () => {
    setIsGeneratingPix(true);
    setError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PAYMENTS}/${paymentId}/pix`,
        { method: "POST" },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Erro ao gerar PIX");
      }
      await fetchCurrentPayment();
    } catch (err) {
      setError(err.message || "Erro de conexão ao gerar o PIX.");
    } finally {
      setIsGeneratingPix(false);
    }
  };

  useEffect(() => {
    if (
      payment &&
      payment.status === "PENDING" &&
      !pixInfo &&
      !isGeneratingPix &&
      !hasAttemptedAutoGenerate.current
    ) {
      hasAttemptedAutoGenerate.current = true;
      handleGeneratePix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, pixInfo, isGeneratingPix]);

  if (isLoadingAuth || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading
          message={
            isLoadingAuth ? "Verificando usuário..." : "Redirecionando..."
          }
        />
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

  if (payment.status === "CONFIRMED") {
    return (
      <PageLayout
        title="Pagamento Confirmado"
        description="Pagamento recebido com sucesso"
      >
        <div className="max-w-2xl mx-auto p-8 bg-green-50 border border-green-200 rounded-lg text-center shadow-sm mt-6">
          <div className="flex justify-center mb-4">
            <svg
              className="w-16 h-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Pagamento Confirmado! 🎉
          </h2>
          <p className="text-sm text-green-700 mb-6">
            Seu pagamento foi recebido e processado com sucesso. Agradecemos!
          </p>
          <p className="text-xs text-green-600 mb-6 animate-pulse">
            Redirecionando para suas finanças em instantes...
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => router.push("/financeiro")}
              variant="primary"
              size="small"
            >
              Ir para minhas finanças agora
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (payment.status !== "PENDING") {
    return (
      <PageLayout title="Pagamento PIX" description="Pagamento indisponível">
        <div className="max-w-2xl mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            O pagamento está em status <strong>{payment.status}</strong> e não
            pode ser pago por PIX nesta tela. Você será redirecionado para o
            financeiro em instantes.
          </p>
        </div>
      </PageLayout>
    );
  }

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

            {pixInfo.date_of_expiration && (
              <div className="flex justify-center mb-4">
                <span className="text-xs text-rose-700 font-semibold text-center bg-rose-50 px-3 py-1.5 rounded border border-rose-200">
                  Válido até:{" "}
                  {new Date(pixInfo.date_of_expiration).toLocaleString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            )}
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
                  <p className="text-xs text-green-600 text-center">
                    Código copiado para área de transferência.
                  </p>
                ) : (
                  <a
                    className="text-blue-600 hover:underline text-center"
                    href={pixInfo.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir pagamento no Mercado Pago
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 p-6 bg-yellow-50 flex flex-col items-center text-center space-y-4 shadow-sm">
            <p className="text-sm text-yellow-800">
              {isGeneratingPix
                ? "Gerando seu código PIX automaticamente, aguarde..."
                : isPixExpired
                  ? "Seu código PIX anterior expirou. Clique no botão abaixo para gerar um novo."
                  : "O código PIX ainda não foi gerado para esta fatura. Clique no botão abaixo para gerá-lo agora."}
            </p>
            <Button
              onClick={handleGeneratePix}
              variant="primary"
              size="small"
              disabled={isGeneratingPix}
              className="w-full max-w-xs"
            >
              {isGeneratingPix ? "Gerando..." : "Gerar PIX"}
            </Button>
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
