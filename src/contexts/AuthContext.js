import { createContext, useContext } from "react";
import useSWR from "swr";
import { settings } from "config/settings.js";

export const USER_ENDPOINT = settings.global.API.ENDPOINTS.USER;

const AuthContext = createContext({
  user: null,
  isLoading: true,
  error: null,
});

const fetcher = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Erro no fetcher:", error);
    return null;
  }
};

export function AuthProvider({ children }) {
  const { data, error, isLoading } = useSWR(USER_ENDPOINT, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    revalidateIfStale: true,
    revalidateOnMount: true,
    dedupingInterval: 0,
  });

  const value = {
    user: data || null,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
