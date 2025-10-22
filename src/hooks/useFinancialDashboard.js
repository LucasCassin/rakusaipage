import { useState, useEffect } from "react";

// No futuro, este hook fará chamadas de API reais.
export function useFinancialDashboard(user, canFetch) {
  const [kpiData, setKpiData] = useState({
    activeStudents: "...",
    revenueThisMonth: "...",
    pendingThisMonth: "...",
    awaitingConfirmation: "...",
  });
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("awaiting_confirmation");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Só busca se o usuário puder ver esta seção
      if (!user || !canFetch) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Simulação de uma chamada à API
      setTimeout(() => {
        setKpiData({
          activeStudents: 20,
          revenueThisMonth: "R$ 2.150,00",
          pendingThisMonth: "R$ 250,00",
          awaitingConfirmation: 3,
        });
        setPayments([
          // Pagamento que o usuário avisou
          {
            id: "1",
            username: "Lucas",
            plan_name: "Plano Mensal",
            due_date: "2025-10-05",
            amount_due: "150.00",
            status: "PENDING",
            user_notified_payment: true,
          },
          // Pagamento pendente normal
          {
            id: "2",
            username: "Alícia",
            plan_name: "Plano Mensal",
            due_date: "2025-10-10",
            amount_due: "150.00",
            status: "PENDING",
            user_notified_payment: false,
          },
          // Pagamento que o usuário avisou
          {
            id: "3",
            username: "Caio",
            plan_name: "Plano Quinzenal",
            due_date: "2025-10-15",
            amount_due: "90.00",
            status: "PENDING",
            user_notified_payment: true,
          },
          // Pagamento já confirmado (para o histórico)
          {
            id: "4",
            username: "Naka",
            plan_name: "Plano Mensal",
            due_date: "2025-09-05",
            amount_due: "150.00",
            status: "CONFIRMED",
            user_notified_payment: true,
          },
          // Pagamento atrasado (OVERDUE)
          {
            id: "5",
            username: "Kevin",
            plan_name: "Plano Mensal",
            due_date: "2025-09-10",
            amount_due: "150.00",
            status: "OVERDUE",
            user_notified_payment: false,
          },
        ]);
        setIsLoading(false);
      }, 1500);
    };

    fetchData();
  }, [user, canFetch]);

  return {
    kpiData,
    payments,
    activeTab,
    setActiveTab,
    isLoading,
    error,
  };
}
