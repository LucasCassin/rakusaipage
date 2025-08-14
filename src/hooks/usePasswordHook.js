import { useState, useCallback, useMemo } from "react";
import { generatePassword } from "src/utils/generatePassword.js";

/**
 * Hook personalizado para gerenciamento de senha
 * @param {string} initialPassword Valor inicial da senha
 * @param {boolean} useValidatePassword Se deve validar a senha
 * @returns {Object} Objeto com métodos e propriedades para gerenciamento de senha
 */
export function usePasswordHook(
  initialPassword = "",
  useValidatePassword = true,
) {
  const [password, setPassword] = useState(initialPassword);

  const [criteria, setCriteria] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
  });

  // Validação de senha memoizada
  const validatePassword = useCallback((value) => {
    setCriteria({
      length: value.length >= 8,
      lowercase: /[a-z]/.test(value),
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[@$!%*?&]/.test(value),
    });
  }, []);

  // Atualizar senha e validar se useValidatePassword é true
  const updatePassword = useCallback(
    (value) => {
      setPassword(value);
      if (useValidatePassword) {
        validatePassword(value);
      }
    },
    [useValidatePassword, validatePassword],
  );

  // Gerar senha aleatória e validar se useValidatePassword é true
  const generateRandomPassword = useCallback(() => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    if (useValidatePassword) {
      validatePassword(newPassword);
    }
    return newPassword;
  }, [useValidatePassword, validatePassword]);

  // Verificar se todos os critérios são válidos
  const isValid = useMemo(() => {
    return Object.values(criteria).every(Boolean);
  }, [criteria]);

  // Resetar estado
  const reset = useCallback((resetPassword = true, resetCriteria = true) => {
    if (resetPassword) {
      setPassword("");
    }
    if (resetCriteria) {
      setCriteria({
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false,
      });
    }
  }, []);

  if (!useValidatePassword) {
    return {
      password,
      useValidatePassword,
      updatePassword,
      generateRandomPassword,
    };
  }

  return {
    password,
    criteria,
    isValid,
    useValidatePassword,
    updatePassword,
    generateRandomPassword,
    reset,
    validatePassword,
  };
}
