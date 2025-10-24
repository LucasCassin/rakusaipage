import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function useUserFinancials() {
  const router = useRouter();
  const [financialData, setFinancialData] = useState(null); // Inicia como nulo
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userFound, setUserFound] = useState(false);

  const fetchUserFinancials = useCallback(
    async (username) => {
      if (!username) {
        clearSearch();
        return;
      }

      setIsLoading(true);
      setError(null);
      setUserFound(false);

      // Simulação de chamada à API
      // No futuro, aqui teríamos chamadas reais como:
      // GET /api/v1/users/[username]/subscriptions
      // GET /api/v1/payments?user_username=[username]
      setTimeout(() => {
        // Simula um usuário encontrado
        if (username.toLowerCase() !== "notfound") {
          setFinancialData({
            subscription: {
              id: "sub1",
              plan_name: "Plano Mensal Pro",
              discount_value: "10.00",
              payment_day: 10,
              start_date: "2025-01-15",
              is_active: true,
            },
            payments: [
              {
                id: "pay1",
                due_date: "2025-10-10",
                amount_due: "140.00",
                status: "CONFIRMED",
                user_notified_payment: true,
                confirmed_at: "2025-10-08",
                plan_name: "Plano Mensal Pro",
              },
              {
                id: "pay2",
                due_date: "2025-09-10",
                amount_due: "140.00",
                status: "PENDING",
                user_notified_payment: true,
                confirmed_at: null,
                plan_name: "Plano Mensal Pro",
              },
              {
                id: "pay3",
                due_date: "2025-08-10",
                amount_due: "140.00",
                status: "OVERDUE",
                user_notified_payment: false,
                confirmed_at: null,
                plan_name: "Plano Mensal Pro",
              },
            ],
          });
          setUserFound(true);
        } else {
          // Simula um usuário não encontrado
          setError(`Usuário "${username}" não encontrado.`);
          setUserFound(false);
        }
        setIsLoading(false);
      }, 1500);
    },
    [router],
  );

  const clearSearch = useCallback(() => {
    setFinancialData(null);
    setUserFound(false);
    setError(null);
  }, []);

  return {
    financialData,
    isLoading,
    error,
    userFound,
    fetchUserFinancials,
    clearSearch,
  };
}
