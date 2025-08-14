import { useState, useCallback } from "react";

export function useMessage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess("");
  }, []);

  const clearAll = useCallback(() => {
    clearError();
    clearSuccess();
  }, [clearError, clearSuccess]);

  return {
    error,
    setError,
    clearError,
    success,
    setSuccess,
    clearSuccess,
    clearAll,
  };
}
