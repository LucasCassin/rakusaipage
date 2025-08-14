import { useState, useCallback } from "react";

/**
 * Hook personalizado para validação de formulários
 * @param {Object} initialState Estado inicial do formulário
 * @param {Object} options Opções adicionais para configurar o comportamento do hook
 * @returns {Object} Objeto com métodos e propriedades para validação do formulário
 */
export function useFormValidation(initialState = {}, options = {}) {
  const {
    passwordValidation,
    validateForm,
    setFieldErrorsHandlers = {},
  } = options;
  const [formData, setFormData] = useState(initialState);

  const { setFieldError, setFieldErrors, clearAllFieldError } =
    setFieldErrorsHandlers;

  // Atualizar campo do formulário
  const updateField = useCallback(
    (name, value) => {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Limpa o erro quando o campo é alterado
      setFieldError(name, "");

      // Validação especial para senha se o hook de validação for fornecido
      if (name === "password" && passwordValidation) {
        passwordValidation.updatePassword(value);
      }
    },
    [passwordValidation],
  );

  // Manipular alterações de campo
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;
      updateField(name, newValue);
    },
    [updateField],
  );

  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormData(initialState);
    clearAllFieldError();

    // Reset de senha se estiver usando validação de senha
    if (passwordValidation && passwordValidation.reset) {
      passwordValidation.reset();
    }
  }, [initialState, passwordValidation]);

  // Verificar se formulário está preenchido corretamente
  const isFormValid = useCallback(() => {
    if (validateForm) {
      return validateForm(formData, passwordValidation);
    }

    // Validação padrão: verifica se todos os campos obrigatórios estão preenchidos
    const hasRequiredFields = Object.entries(formData).every(
      ([key, value]) =>
        !Object.prototype.hasOwnProperty.call(initialState, key) || !!value,
    );

    // Validação adicional para senha se o hook de validação for fornecido
    const hasValidPassword = !passwordValidation || passwordValidation.isValid;

    return hasRequiredFields && hasValidPassword;
  }, [formData, passwordValidation, validateForm, initialState]);

  const clearFieldErrors = useCallback((name) => {
    setFieldError(name, "");
  }, []);

  return {
    formData,
    setFieldErrors,
    handleChange,
    updateField,
    resetForm,
    isFormValid,
    clearFieldErrors,
  };
}
