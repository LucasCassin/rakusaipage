import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import Spinner from "components/ui/Spinner";
import Switch from "components/ui/Switch";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

export default function PlanUsersModal({ plan, onClose }) {
  const { triggerKpiRefetch } = useFinancialsDashboard();
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'inactive'
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error, setError } = useMessage();

  // Busca os dados ao montar o componente
  useEffect(() => {
    fetchSubscriptions();
  }, [plan.id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup para remover o listener quando o modal desmontar
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function fetchSubscriptions() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/v1/payment-plans/${plan.id}/subscriptions`,
      );
      if (!response.ok) {
        throw new Error("Erro ao buscar usuários do plano.");
      }
      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleStatus(subscriptionId, currentStatus) {
    // Optimistic UI Update (atualiza visualmente antes do servidor)
    const originalSubscriptions = [...subscriptions];
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === subscriptionId ? { ...sub, is_active: !currentStatus } : sub,
      ),
    );

    try {
      const response = await fetch(`/api/v1/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar status.");
      } else {
        triggerKpiRefetch();
      }
    } catch (err) {
      // Reverte em caso de erro
      setSubscriptions(originalSubscriptions);
      setError("Erro ao atualizar o status da assinatura.");
      setTimeout(() => setError(null), 2000);
      console.error("Erro ao atualizar o status da assinatura: ", err);
    }
  }

  // Filtra as listas baseadas no estado
  const activeSubscriptions = subscriptions.filter((sub) => sub.is_active);
  const inactiveSubscriptions = subscriptions.filter((sub) => !sub.is_active);

  const listToRender =
    activeTab === "active" ? activeSubscriptions : inactiveSubscriptions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Gestão de Alunos
            </h3>
            <p className="text-sm text-gray-500">
              Plano: <span className="font-medium">{plan.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium focus:outline-none ${
              activeTab === "active"
                ? "text-rakusai-pink border-b-2 border-rakusai-pink"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("active")}
          >
            Ativos ({activeSubscriptions.length})
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium focus:outline-none ${
              activeTab === "inactive"
                ? "text-rakusai-pink border-b-2 border-rakusai-pink"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("inactive")}
          >
            Inativos ({inactiveSubscriptions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {error && <Alert type="error">{error}</Alert>}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : listToRender.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              Nenhum aluno nesta categoria.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {listToRender.map((sub) => (
                <li
                  key={sub.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex flex-col pl-4">
                    <span className="font-medium text-gray-800">
                      {sub.username}
                    </span>
                    <span className="text-xs text-gray-400">
                      Início:{" "}
                      {new Date(sub.start_date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pr-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        sub.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {sub.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={sub.is_active}
                      onChange={() => handleToggleStatus(sub.id, sub.is_active)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
            size="small"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
