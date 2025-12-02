import React, { useState } from "react";
import Alert from "components/ui/Alert";
import UserAvatar from "components/ui/UserAvatar";
import { useUserSubscriptionStatus } from "src/hooks/useUserSubscriptionStatus"; // Importando o hook

export default function UserSubscriptionStatus() {
  const [activeTab, setActiveTab] = useState("with_plan"); // 'with_plan' | 'without_plan'

  // Utilizando o hook para obter os dados
  const { users, isLoading, error } = useUserSubscriptionStatus();

  // Lógica de separação (view logic)
  const usersWithPlan = users.filter((u) => u.active_count > 0);
  const usersWithoutPlan = users.filter((u) => u.active_count === 0);

  const currentList =
    activeTab === "with_plan" ? usersWithPlan : usersWithoutPlan;

  if (isLoading)
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden my-8 animate-pulse">
        {/* Tabs Skeleton */}
        <div className="flex border-b border-gray-200">
          <div className="flex-1 py-3 flex justify-center border-b-2 border-transparent">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1 py-3 flex justify-center border-b-2 border-transparent">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* List Content Skeleton */}
        <div className="max-h-96 overflow-y-auto">
          <ul className="divide-y divide-gray-100">
            {[...Array(5)].map((_, index) => (
              <li
                key={index}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar Skeleton */}
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                  {/* Username Skeleton */}
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>

                {/* Badge/Count Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block h-3 w-10 bg-gray-200 rounded"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  if (error) return <Alert type="error">{error}</Alert>;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden my-8">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 text-sm font-medium focus:outline-none transition-colors ${
            activeTab === "with_plan"
              ? "text-rakusai-pink border-b-2 border-rakusai-pink bg-pink-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("with_plan")}
        >
          Com Plano Ativo ({usersWithPlan.length})
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium focus:outline-none transition-colors ${
            activeTab === "without_plan"
              ? "text-red-600 border-b-2 border-red-600 bg-red-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("without_plan")}
        >
          Sem Plano Ativo ({usersWithoutPlan.length})
        </button>
      </div>

      {/* List Content */}
      <div className="max-h-96 overflow-y-auto">
        {currentList.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            Nenhum usuário nesta lista.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {currentList.map((user) => (
              <li
                key={user.id}
                className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar username={user.username} size="sm" />
                  <span className="text-sm font-medium text-gray-800">
                    {user.username}
                  </span>
                </div>

                {activeTab === "with_plan" && (
                  <div
                    className="flex items-center gap-2"
                    title="Quantidade de planos ativos"
                  >
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      Planos:
                    </span>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-200 text-rakusai-pink text-xs font-bold">
                      {user.active_count}
                    </span>
                  </div>
                )}

                {activeTab === "without_plan" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inativo
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
