import { useRouter } from "next/router";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";

import PageLayout from "components/layouts/PageLayout";

// Importação dos hooks personalizados
import { usePasswordHook } from "src/hooks/usePasswordHook";
import { useFormValidation } from "src/hooks/useFormValidation";
import { useFormSubmit } from "src/hooks/useFormSubmit";
import { useMessage } from "src/hooks/useMessage";

// Importação dos textos
import { texts } from "src/utils/texts.js";

// Importação dos componentes UI
import Alert from "components/ui/Alert";
import { useSetFieldError } from "src/hooks/useSetFieldError";
// Importação dos componentes de modal
import TermsModal from "components/modals/TermsModal";
import RegisterForm from "components/forms/RegisterForm";
const { REQUIRE_TERMS } = settings.register;

/**
 * Componente principal da página de registro
 */
export default function Register() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const {
    error,
    setError,
    success,
    setSuccess,
    clearError,
    clearSuccess,
    clearAll,
  } = useMessage();
  const {
    setFieldError,
    fieldErrors,
    setFieldErrors,
    fieldErrorMapping,
    clearAllFieldError,
  } = useSetFieldError({
    fieldErrorMapping: {
      email: texts.register.label.email,
      password: texts.register.label.password,
      username: texts.register.label.username,
    },
  });

  // Refs para campos de formulário
  const usernameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Estados de UI
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");
  const [showContent, setShowContent] = useState(true);

  // Hook de validação de senha
  const passwordHook = usePasswordHook();

  // Função de validação para o formulário
  const validateRegistrationForm = useCallback(
    (formData) => {
      const hasRequiredFields = Boolean(
        formData.username?.trim() &&
          formData.email?.trim() &&
          formData.password?.trim(),
      );

      const hasValidPassword = passwordHook.isValid;
      const hasAcceptedTerms = REQUIRE_TERMS ? formData.acceptTerms : true;

      return hasRequiredFields && hasValidPassword && hasAcceptedTerms;
    },
    [passwordHook.isValid],
  );

  // Hook de validação do formulário
  const { formData, handleChange, isFormValid, updateField, resetForm } =
    useFormValidation(
      {
        username: "",
        email: "",
        password: "",
        ...(REQUIRE_TERMS && { acceptTerms: false }),
      },
      {
        passwordValidation: passwordHook,
        validateForm: validateRegistrationForm,
        setFieldErrorsHandlers: {
          setFieldError,
          setFieldErrors,
          clearAllFieldError,
        },
      },
    );

  // Hook de submissão do formulário
  const { submitForm, isLoading } = useFormSubmit({
    url: settings.global.API.ENDPOINTS.USERS,
    method: "POST",
    // successRedirect: settings.register.REDIRECT_AFTER_REGISTER,
    // onSucess: resetForm,
    successMessage: texts.register.message.success.registration,
    router,
    setFieldErrorsHandlers: {
      setFieldError,
      setFieldErrors,
      clearAllFieldError,
      fieldErrorMapping,
    },
    messageHook: { setError, setSuccess, clearError, clearSuccess, clearAll },
    validateBeforeSubmit: (formData) => {
      // Verificar aceitação dos termos
      if (REQUIRE_TERMS && formData.acceptTerms) {
        return {
          isValid: false,
          message: texts.register.message.error.termsRequired,
        };
      }

      // Verificar senha
      if (!passwordHook.isValid) {
        return {
          isValid: false,
          errors: {
            password: texts.register.message.error.passwordSecurity,
          },
        };
      }

      return { isValid: true };
    },
  });

  // Efeito para verificar se usuário já está logado
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.tables.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.LOGIN, {
          scroll: false,
        });
      }, 3000);
      return;
    }

    const userPermissions = {
      canCreate: user.features?.includes(settings.register.FEATURE_CREATE_USER),
    };

    if (!userPermissions.canCreate) {
      setError(texts.register.message.error.forbidden);
      setShowContent(false);
      router.push(settings.register.FORBIDDEN_REDIRECT, { scroll: false });
      return;
    }

    setShowContent(true);

    // if (user) {
    //   setError(
    //     <div className="flex flex-col items-center">
    //       <p>{texts.register.message.error.loggedIn}</p>
    //       <button
    //         onClick={() => {
    //           setShowContent(false);
    //           router.push(`/logout?from=${encodeURIComponent("/register")}`);
    //         }}
    //         className="mt-4 text-blue-600 hover:text-blue-800 underline"
    //       >
    //         {texts.register.button.logoutAndContinue}
    //       </button>
    //     </div>,
    //   );
    // }
  }, [user, router, isLoadingAuth, setError, setShowContent]);

  // Efeito para focar no campo de username na montagem inicial
  useEffect(() => {
    if (!user && usernameInputRef.current && !isLoading) {
      usernameInputRef.current.focus();
    }
  }, [user, isLoading]);

  // Abrir/fechar modal de termos
  const toggleTermsModal = useCallback((isOpen) => {
    setShowTermsModal(isOpen);
  }, []);

  // Alterar aba ativa no modal
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Handlers para os botões de termos e privacidade
  const handleOpenTerms = useCallback(() => {
    setActiveTab("terms");
    toggleTermsModal(true);
  }, [toggleTermsModal]);

  const handleOpenPrivacy = useCallback(() => {
    setActiveTab("privacy");
    toggleTermsModal(true);
  }, [toggleTermsModal]);

  // Submissão do formulário
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Verificar se usuário não está logado
      if (!user) {
        // setError(
        //   <div className="flex flex-col items-center">
        //     <p>{texts.register.message.error.loggedIn}</p>
        //     <button
        //       onClick={() => {
        //         setShowContent(false);
        //         router.push(`/logout?from=${encodeURIComponent("/register")}`);
        //       }}
        //       className="mt-4 text-blue-600 hover:text-blue-800 underline"
        //     >
        //       {texts.register.button.logoutAndContinue}
        //     </button>
        //   </div>,
        // );
        setError(texts.register.message.error.loggedIn);
        return;
      }

      const success = await submitForm(
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        },
        setFieldErrors,
      );

      if (success) {
        setShowContent(false);
        setTimeout(() => {
          setShowContent(true);
          clearAll();
        }, 2000);
        resetForm();
      }
    },
    [formData, user, router, submitForm, setFieldErrors, setError],
  );

  // Renderizar formulário de registro
  const renderRegisterForm = useMemo(() => {
    if (!showContent) return null;

    return (
      <RegisterForm
        formData={formData}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        isLoading={isLoading}
        user={user}
        passwordHook={passwordHook}
        handleChange={handleChange}
        handleOpenTerms={handleOpenTerms}
        handleOpenPrivacy={handleOpenPrivacy}
        handleSubmit={handleSubmit}
        isFormValid={isFormValid}
        texts={texts.register}
        usernameInputRef={usernameInputRef}
        emailInputRef={emailInputRef}
        passwordInputRef={passwordInputRef}
        updateField={updateField}
      />
    );
  }, [
    showContent,
    formData,
    fieldErrors,
    setFieldErrors,
    isLoading,
    user,
    passwordHook,
    handleChange,
    handleOpenTerms,
    handleOpenPrivacy,
    handleSubmit,
    isFormValid,
    updateField,
  ]);

  return (
    <PageLayout title={texts.register.title} description="Crie sua conta">
      <div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {texts.register.title}
        </h1>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <Alert type="error">{error}</Alert>
        <Alert type="success">{success}</Alert>

        {renderRegisterForm}
      </form>

      {showContent && (
        <TermsModal
          isOpen={showTermsModal}
          onClose={() => toggleTermsModal(false)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
    </PageLayout>
  );
}
