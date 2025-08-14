"use client";

import Link from "next/link";
import { useAuth } from "src/contexts/AuthContext";
import { settings } from "config/settings";
import * as HeroIcons from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { texts } from "src/utils/texts.js";
import { useRouter } from "next/router";

// Função para formatar data no formato dd/mm/yyyy
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function HomeContent() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Função para verificar se o usuário tem todas as features de um conjunto
  const hasFeatureSet = (featureSet) => {
    if (!user || !user.features) return false;
    return featureSet.every((feature) => user.features.includes(feature));
  };

  // Função para verificar se o usuário tem pelo menos um dos conjuntos de features
  const hasPermission = (featureSets) => {
    if (!featureSets) return true; // Se não tem regras, sempre permite
    return featureSets.some((featureSet) => hasFeatureSet(featureSet));
  };

  // Função para obter o ícone baseado no nome
  const getIcon = (iconName) => {
    if (!iconName) return null;
    return HeroIcons[iconName] || null;
  };

  // Filtra os itens de acesso rápido que o usuário tem permissão para ver
  const filteredQuickAccess = settings.home.INTERNAL.QUICK_ACCESS.filter(
    (item) => !item.FEATURES || hasPermission(item.FEATURES),
  );

  // Adicione a função para navegação
  const handleNavigation = (href, e) => {
    if (e) e.preventDefault();
    router.push(href);
  };

  // Se não estiver montado, retorna null para evitar renderização no servidor
  if (!isMounted) {
    return null;
  }

  // Se o usuário não estiver conectado, mostra a tela de boas-vindas
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight lg:text-5xl">
            {texts.homeContent.welcome.title}
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-3xl mx-auto">
            {texts.homeContent.welcome.description}
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href={settings.header.LOGIN_REDIRECT}
              onClick={(e) =>
                handleNavigation(settings.header.LOGIN_REDIRECT, e)
              }
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition duration-150 ease-in-out"
            >
              {texts.homeContent.button.login}
            </Link>
            <Link
              href={settings.header.CREATE_USER_REDIRECT}
              onClick={(e) =>
                handleNavigation(settings.header.CREATE_USER_REDIRECT, e)
              }
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition duration-150 ease-in-out"
            >
              {texts.homeContent.button.register}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight lg:text-5xl">
              {texts.homeContent.welcome.loggedInTitle.replace(
                "{username}",
                user.username,
              )}
            </h1>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              {texts.homeContent.welcome.loggedInDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Quick Access Section */}
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {texts.homeContent.sections.quickAccess}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuickAccess.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavigation(item.href, e)}
                  className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center">
                    {Icon && (
                      <div className="flex-shrink-0">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Communications Section */}
        <div className="mt-8 px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {texts.homeContent.sections.communications}
          </h2>
          <div className="space-y-4">
            {settings.home.INTERNAL.COMMUNICATIONS.map((communication) => (
              <div
                key={communication.title}
                className={`bg-white p-6 rounded-lg shadow-sm ${
                  communication.type === "warning"
                    ? "border-l-4 border-yellow-400"
                    : "border-l-4 border-blue-400"
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {communication.type === "warning" ? (
                      <HeroIcons.ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                    ) : (
                      <HeroIcons.InformationCircleIcon className="h-6 w-6 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {communication.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(communication.date)}
                      </p>
                    </div>
                    <p className="mt-2 text-gray-500">
                      {communication.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
