import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import Alert from "components/ui/Alert";
import { usePasswordHook } from "src/hooks/usePasswordHook";
import { useUserSearch } from "src/hooks/useUserSearch";
import UserSearchComponent from "components/forms/UserSearchComponent";
import SwitchMode from "components/forms/SwitchMode";
import PasswordForm from "components/forms/PasswordForm";
import { useMessage } from "src/hooks/useMessage";
import { useSetFieldError } from "src/hooks/useSetFieldError";
import PageLayout from "components/layouts/PageLayout";
import useUrlManager from "src/hooks/useUrlManager";

/**
 * Main component for password update
 */
export default function UpdatePassword() {
  // ===== Hooks and Contexts =====
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
  const { updateUrl, getParamValue } = useUrlManager();
  const {
    setFieldError,
    setFieldErrors,
    clearAllFieldError,
    fieldErrors,
    fieldErrorMapping,
  } = useSetFieldError({
    fieldErrorMapping: {
      password: texts.profilePassword.errorMapping.password,
      username: texts.profilePassword.errorMapping.username,
    },
  });

  // ===== Refs =====
  const refs = {
    username: useRef(null),
    password: useRef(null),
    targetUserSearch: useRef(null),
    hasFetchedUserData: useRef(false),
  };

  // ===== State Definitions =====
  const [state, setState] = useState({
    updateMode: "self",
    targetUsername: "",
    displayTitle: "",
    isUpdating: false,
    showContent: true,
    showPasswordContent: true,
    canUpdateOthers: false,
    canUpdateSelf: false,
  });

  // ===== Custom Hooks =====
  const passwordHook = usePasswordHook();
  const userSearch = useUserSearch({
    fieldErrorMapping: fieldErrorMapping,
    onSuccessCallback: () => {
      passwordHook.reset();
      setTimeout(() => refs.password.current?.focus(), 100);
    },
    setFieldErrorsHandlers: {
      setFieldErrors,
      clearAllFieldError,
      fieldErrorMapping,
    },
    messageHandlers: {
      setError,
      clearError,
    },
  });

  // ===== URL and Query Parameters =====
  const queryUsername = getParamValue("username");
  const isExpiredQuery = getParamValue("expired") === "true";

  // ===== Handlers =====
  // Form state handlers
  const resetFormState = useCallback(
    (
      userFound = false,
      resetPassword = true,
      clearAllErrorsMessage = true,
      clearAllFieldErrors = true,
    ) => {
      if (resetPassword) {
        passwordHook.reset();
      }
      if (clearAllErrorsMessage) {
        clearAll();
      }
      if (clearAllFieldErrors) {
        clearAllFieldError();
      }
      userSearch.setUserFound(userFound);
    },
    [passwordHook, userSearch, clearAll, clearAllFieldError],
  );

  // URL update handler
  const updateUrlWithUsername = useCallback(
    (username) => {
      if (isExpiredQuery) {
        updateUrl("username", "");
        updateUrl("expired", "true");
      } else if (username) {
        updateUrl("username", username);
      } else {
        updateUrl("username", "");
      }
    },
    [isExpiredQuery, updateUrl],
  );

  // Form submission handler
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      resetFormState(true, false, true, false);
      setState((prev) => ({ ...prev, isUpdating: true }));
      if (!passwordHook.isValid) {
        setFieldError("password", texts.profilePassword.message.error.security);
        setState((prev) => ({ ...prev, isUpdating: false }));
        return;
      }

      if (!state.targetUsername) {
        setError(texts.profilePassword.message.error.noUser);
        return;
      }

      userSearch.setIsLoading(true);
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.USERS}/${state.targetUsername}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: passwordHook.password }),
        },
      );

      await handleApiResponse({
        response,
        router,
        setError,
        setFieldErrors: setFieldErrors,
        fieldErrorMapping: fieldErrorMapping,
        errorConfig: {
          default: {
            action: () => {
              passwordHook.reset();
              setTimeout(() => {
                resetFormState();
                setState((prev) => ({ ...prev, isUpdating: false }));
              }, 4000);
            },
          },
        },
        onSuccess: () => {
          if (state.targetUsername === user?.username) {
            setSuccess(texts.profilePassword.message.success.self);
            resetFormState();
            setTimeout(() => {
              router.push(`/logout?from=${encodeURIComponent("/login")}`);
            }, 2000);
          } else {
            setSuccess(texts.profilePassword.message.success.other);
            resetFormState();
            setTimeout(() => {
              setState((prev) => ({
                ...prev,
                isUpdating: false,
              }));
              userSearch.fetchUserData(state.targetUsername);
            }, 3000);
          }
        },
        onFinally: () => setTimeout(passwordHook.reset, 3000),
        onError: () => {
          clearSuccess();
          setTimeout(() => {
            resetFormState();
            userSearch.setIsLoading(false);
            setState((prev) => ({ ...prev, isUpdating: false }));
          }, 3000);
        },
      });
    },
    [
      state.targetUsername,
      user,
      passwordHook,
      resetFormState,
      router,
      userSearch,
      setError,
      setSuccess,
      clearError,
      clearSuccess,
    ],
  );

  // Mode change handler
  const handleUpdateModeChange = useCallback(
    (mode) => {
      setState((prev) => ({
        ...prev,
        updateMode: mode,
        showPasswordContent: mode === "self" ? true : false,
      }));

      resetFormState();

      if (mode === "self") {
        updateUrlWithUsername("");
        setState((prev) => ({
          ...prev,
          targetUsername: user?.username,
          displayTitle: isExpiredQuery
            ? texts.profilePassword.titleExpired
            : texts.profilePassword.title,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          targetUsername: "",
          displayTitle: texts.profilePassword.title,
        }));
      }
    },
    [user, isExpiredQuery, passwordHook, userSearch, router],
  );

  // ===== Effects =====
  // Initial setup and permissions effect
  /* eslint-disable */
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.profilePassword.message.error.notAuthenticated);
      setState((prev) => ({ ...prev, showContent: false }));
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 2000);
      return;
    }

    const permissions = {
      canUpdateSelf: user.features?.includes(
        settings.updatePassword.FEATURE_UPDATE_SELF,
      ),
      canUpdateOther: user.features?.includes(
        settings.updatePassword.FEATURE_UPDATE_OTHER,
      ),
      canReadOther: user.features?.includes(
        settings.updatePassword.FEATURE_READ_OTHER,
      ),
    };

    const canUpdateOther =
      permissions.canUpdateOther && permissions.canReadOther;

    if (!permissions.canUpdateSelf && !canUpdateOther) {
      setError(texts.profilePassword.message.error.noPermission);
      setState((prev) => ({ ...prev, showContent: false }));
      router.push(settings.updateUser.FORBIDDEN_REDIRECT);
      return;
    }

    const newState = {
      canUpdateSelf: permissions.canUpdateSelf,
      canUpdateOthers: canUpdateOther,
      showContent: true,
    };

    if (isExpiredQuery) {
      newState.displayTitle = texts.profilePassword.titleExpired;
      newState.updateMode = "self";
      newState.targetUsername = user.username;
      setError(texts.profilePassword.message.error.passwordExpired);
      setState((prev) => ({
        ...prev,
        ...newState,
      }));

      updateUrlWithUsername("");
      return;
    } else {
      newState.displayTitle = texts.profilePassword.title;
      newState.updateMode = !permissions.canUpdateSelf
        ? "other"
        : !canUpdateOther
          ? "self"
          : state.updateMode;
      newState.targetUsername =
        newState.updateMode === "self" ? user.username : queryUsername || "";
    }

    if (queryUsername && !isExpiredQuery) {
      if (!canUpdateOther || queryUsername === user.username) {
        newState.updateMode = "self";
        newState.targetUsername = user.username;
        updateUrlWithUsername("");
        setState((prev) => ({
          ...prev,
          ...newState,
        }));

        return;
      } else {
        newState.updateMode = "other";
        newState.targetUsername = queryUsername;
      }
    }

    setState((prev) => ({
      ...prev,
      ...newState,
    }));
    if (!refs.hasFetchedUserData.current) {
      if (!userSearch.userFound && !userSearch.isLoading) {
        userSearch.fetchUserData(newState.targetUsername);
        refs.hasFetchedUserData.current = true;
      }
    }
  }, [user, isLoadingAuth, queryUsername, isExpiredQuery]);
  /* eslint-enable */
  // Focus management effect
  useEffect(() => {
    if (userSearch.isLoading) return;

    const shouldFocusPassword =
      (state.updateMode === "self" && !success) ||
      (state.updateMode === "other" && userSearch.userFound);
    const shouldFocusUsername =
      state.updateMode === "other" && !userSearch.userFound;

    if (shouldFocusPassword && refs.password.current) {
      refs.password.current.focus();
    } else if (shouldFocusUsername && refs.username.current) {
      refs.username.current.focus();
    }
  }, [
    state.updateMode,
    success,
    userSearch.isLoading,
    userSearch.userFound,
    refs.password,
    refs.username,
  ]);

  // ===== Component Renderers =====
  const layoutMaxWidth = state.canUpdateOthers ? "max-w-xl" : "max-w-md";

  const UserSearchField = useMemo(() => {
    if (state.updateMode !== "other" || !state.showContent) {
      return null;
    }

    return (
      <UserSearchComponent
        setState={setState}
        error={fieldErrors.username}
        setError={setError}
        disabled={userSearch.isLoading || state.isUpdating}
        inputRef={refs.username}
        targetUsername={state.targetUsername}
        updateMode={state.updateMode}
        user={user}
        userSearch={userSearch}
        texts={texts.profilePassword}
        updateUrlWithUsername={updateUrlWithUsername}
      />
    );
  }, [
    state.isUpdating,
    refs.username,
    state.targetUsername,
    state.updateMode,
    user,
    userSearch,
    updateUrlWithUsername,
    setState,
    state.showContent,
  ]);

  const PasswordFormContent = useMemo(() => {
    if (
      !state.showContent ||
      !state.showPasswordContent ||
      !(
        (state.updateMode === "self" && !success) ||
        (state.updateMode === "other" && userSearch.userFound)
      )
    ) {
      return null;
    }

    return (
      <PasswordForm
        onSubmit={handleSubmit}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        disabled={userSearch.isLoading || state.isUpdating}
        passwordHook={passwordHook}
        texts={texts.profilePassword}
        inputRef={refs.password}
        textButton={
          userSearch.isLoading || state.isUpdating
            ? texts.profilePassword.button.loading
            : texts.profilePassword.button.update
        }
      />
    );
  }, [
    state.updateMode,
    success,
    state.showContent,
    state.showPasswordContent,
    state.isUpdating,
    userSearch.userFound,
    userSearch.isLoading,
    fieldErrors,
    passwordHook,
    handleSubmit,
    refs.password,
    setFieldErrors,
  ]);

  const ModeSwitchButtons = useMemo(() => {
    if (
      !state.canUpdateOthers ||
      (success && state.updateMode !== "other") ||
      !state.showContent
    ) {
      return null;
    }

    return (
      <SwitchMode
        canUpdateSelf={state.canUpdateSelf}
        updateMode={state.updateMode}
        handleUpdateModeChange={handleUpdateModeChange}
        disabled={userSearch.isLoading || state.isUpdating}
        textSelf={texts.profilePassword.button.self}
        textOther={texts.profilePassword.button.other}
      />
    );
  }, [
    state.canUpdateOthers,
    state.canUpdateSelf,
    success,
    state.updateMode,
    state.showContent,
    state.isUpdating,
    userSearch.isLoading,
    handleUpdateModeChange,
  ]);

  // ===== Main Render =====
  return (
    <PageLayout
      title={state.displayTitle || texts.profilePassword.title}
      description="Altere sua senha"
      maxWidth={layoutMaxWidth}
    >
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          {state.displayTitle || texts.profilePassword.title}
        </h2>
      </div>

      {ModeSwitchButtons && (
        <div className="flex justify-center w-full">{ModeSwitchButtons}</div>
      )}

      {UserSearchField && (
        <div className="flex justify-center w-full">{UserSearchField}</div>
      )}

      <form className="mt-8 space-y-6 w-full" onSubmit={handleSubmit}>
        <Alert type={isExpiredQuery ? "warning" : "error"} show={!!error}>
          {error}
        </Alert>

        <Alert type="success" show={!!success}>
          {success}
        </Alert>

        <div className="flex justify-center w-full">{PasswordFormContent}</div>
      </form>
    </PageLayout>
  );
}
