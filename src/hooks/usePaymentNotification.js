import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";

export function usePaymentNotification() {
  const router = useRouter();
  const [isNotifying, setIsNotifying] = useState(false);
  const [error, setError] = useState(null);

  const notifyPayment = useCallback(
    async (paymentId, { onSuccess } = {}) => {
      setIsNotifying(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/payments/${paymentId}/notify`, {
          method: "POST",
        });

        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (data) => {
            if (onSuccess) onSuccess(data);
          },
        });
      } catch (err) {
        console.error("Erro ao notificar pagamento:", err);
        setError("Erro inesperado ao tentar notificar.");
      } finally {
        setIsNotifying(false);
      }
    },
    [router],
  );

  return { notifyPayment, isNotifying, error };
}
