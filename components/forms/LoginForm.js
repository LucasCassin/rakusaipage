import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { mutate } from "swr";
import { USER_ENDPOINT } from "src/contexts/AuthContext.js";
import { useView } from "src/contexts/ViewContext";
import { settings } from "config/settings.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { texts } from "src/utils/texts.js";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import PasswordForm from "components/forms/PasswordForm";
import { usePasswordHook } from "src/hooks/usePasswordHook";
import { useMessage } from "src/hooks/useMessage";
import { useSetFieldError } from "src/hooks/useSetFieldError";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const emailInputRef = useRef(null);
  const { error, setError, clearError, success, setSuccess, clearSuccess } =
    useMessage();
  const passwordHook = usePasswordHook("", false);
  const { fieldErrors, setFieldErrors, fieldErrorMapping, clearAllFieldError } =
    useSetFieldError({
      fieldErrorMapping: {
        email: texts.login.label.email,
        password: texts.login.label.password,
      },
    });
  const [state, setState] = useState({
    email: "",
    isLoading: false,
    showPassword: false,
    isPasswordExpired: false,
    showContent: true,
  });
  const { switchToStudent } = useView();

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearAllFieldError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    clearSuccess();
    clearAllFieldError();
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isPasswordExpired: false,
    }));

    try {
      const response = await fetch(settings.global.API.ENDPOINTS.SESSIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          password: passwordHook.password,
        }),
      });

      await handleApiResponse({
        response,
        router,
        setError,
        setFieldErrors: setFieldErrors,
        fieldErrorMapping: fieldErrorMapping,
        errorConfig: {
          UnauthorizedError: {
            message: texts.login.message.error.invalidCredentials,
            action: () => {
              setError(texts.login.message.error.invalidCredentials);
            },
          },
          ForbiddenError: {
            message: texts.login.message.error.forbiddenAccess,
            action: () => {
              setState((prev) => ({ ...prev, showContent: false }));
              router.push(settings.auth.FORBIDDEN_REDIRECT);
            },
          },
          PasswordExpiredError: {
            message: texts.login.message.error.passwordExpired,
            action: async () => {
              setState((prev) => ({
                ...prev,
                showContent: false,
                isPasswordExpired: true,
              }));
              await mutate(USER_ENDPOINT);
              router.push("/profile/password?expired=true");
            },
          },
        },
        onSuccess: async () => {
          switchToStudent();
          setSuccess(texts.login.message.success.login);
          setState((prev) => ({
            ...prev,
            showContent: false,
          }));
          await mutate(USER_ENDPOINT);
          setTimeout(() => {
            router.push(settings.auth.REDIRECT_AFTER_LOGIN);
          }, 50);
        },
        onFinally: () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        },
        onError: () => {
          emailInputRef.current?.focus();
        },
      });
    } catch (error) {
      setError(texts.login.message.error.connection);
      setState((prev) => ({ ...prev, isLoading: false }));
      console.error("Error:", error);
      emailInputRef.current?.focus();
    }
  };

  const EmailField = useMemo(() => {
    if (!state.showContent || state.isPasswordExpired) return null;

    return (
      <FormInput
        inputRef={emailInputRef}
        id="email"
        name="email"
        type="email"
        label={texts.login.label.email}
        placeholder={texts.login.placeholder.email}
        value={state.email}
        onChange={handleChange}
        disabled={state.isLoading}
        error={fieldErrors.email}
      />
    );
  }, [
    state.showContent,
    state.isPasswordExpired,
    state.email,
    state.isLoading,
    fieldErrors.email,
  ]);

  const PasswordField = useMemo(() => {
    if (!state.showContent || state.isPasswordExpired) return null;

    return (
      <PasswordForm
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        disabled={state.isLoading}
        passwordHook={passwordHook}
        texts={texts.login}
        showPassword={state.showPassword}
        setShowPassword={(show) =>
          setState((prev) => ({ ...prev, showPassword: show }))
        }
        showSubmitButton={false}
        showGeneratePasswordButton={false}
      />
    );
  }, [
    state.showContent,
    state.isPasswordExpired,
    state.isLoading,
    state.showPassword,
    fieldErrors,
    passwordHook,
  ]);

  const SubmitButton = useMemo(() => {
    if (!state.showContent || state.isPasswordExpired) return null;

    return (
      <Button
        type="submit"
        variant="primary"
        disabled={state.isLoading}
        className="w-full"
      >
        {state.isLoading
          ? texts.login.button.loading
          : texts.login.button.submit}
      </Button>
    );
  }, [state.showContent, state.isPasswordExpired, state.isLoading]);

  return (
    <form className="mt-8 space-y-6 w-full" onSubmit={handleSubmit}>
      <Alert type="error" show={!!error}>
        {error}
      </Alert>
      <Alert type="success" show={!!success}>
        {success}
      </Alert>
      {state.showContent && (
        <>
          <div className="space-y-4">
            {EmailField}
            {PasswordField}
          </div>
          <div className="flex justify-start text-sm mt-1 mb-4">
            <Link
              href="/login/forgot-password"
              className="text-rakusai-purple hover:text-rakusai-purple-dark transition-colors"
            >
              Esqueci minha senha.
            </Link>
          </div>
          {SubmitButton}
        </>
      )}
    </form>
  );
}
