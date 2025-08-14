import { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import Alert from "components/ui/Alert";
import SwitchMode from "components/forms/SwitchMode";
import UserSearchComponent from "components/forms/UserSearchComponent";
import { useUserSearch } from "src/hooks/useUserSearch";
import { useMessage } from "src/hooks/useMessage";
import { useSetFieldError } from "src/hooks/useSetFieldError";
import PasswordExpirationAlert from "components/ui/PasswordExpirationAlert";
import UserInfo from "components/ui/UserInfo";
import PageLayout from "components/layouts/PageLayout";
import useUrlManager from "src/hooks/useUrlManager";

export default function Profile() {
  const router = useRouter();
  const { username: queryUsername = "" } = router.query;
  const { user, isLoading: isLoadingAuth } = useAuth();
  const refs = {
    usernameInputRef: useRef(null),
    hasFetchedUserData: useRef(false),
  };
  const { updateUrl } = useUrlManager();
  // State geral
  const [state, setState] = useState({
    updateMode: "self",
    targetUsername: "",
    userData: null,
    showContent: true,
    canViewOthers: false,
    canViewSelf: false,
    manualModeChange: false,
  });

  const { error, setError, clearError } = useMessage();
  const { setFieldErrors, clearAllFieldError, fieldErrors, fieldErrorMapping } =
    useSetFieldError({
      fieldErrorMapping: {
        username: texts.profile.errorMapping.username,
      },
    });

  // Busca de usuário
  const userSearch = useUserSearch({
    setFieldErrorsHandlers: {
      setFieldErrors,
      clearAllFieldError,
      fieldErrorMapping,
    },
    messageHandlers: { setError, clearError },
    onSuccessCallback: (data) => {
      setState((prev) => ({
        ...prev,
        userData: data,
      }));
      clearError();
    },
    resetCallback: () =>
      setState((prev) => ({
        ...prev,
        userData: null,
      })),
  });

  // Permissões e inicialização
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      setState((prev) => ({
        ...prev,
        showContent: false,
      }));
      setError(texts.profile.message.error.notAuthenticated);
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 2000);
      return;
    }
    const permissions = {
      canViewSelf: user.features?.includes(settings.profile.FEATURE_READ_SELF),
      canViewOther: user.features?.includes(
        settings.profile.FEATURE_READ_OTHER,
      ),
    };
    if (!permissions.canViewSelf && !permissions.canViewOther) {
      setState((prev) => ({
        ...prev,
        showContent: false,
      }));
      setError(texts.profile.message.error.noPermission);
      router.push(settings.profile.FORBIDDEN_REDIRECT);
      return;
    }
    setState((prev) => ({
      ...prev,
      canViewSelf: permissions.canViewSelf,
      canViewOthers: permissions.canViewOther,
    }));
    if (state.manualModeChange) return;
    let userSearchUsername = "";
    if (queryUsername) {
      if (!permissions.canViewOther || queryUsername === user.username) {
        userSearchUsername = user.username;
        setState((prev) => ({
          ...prev,
          updateMode: "self",
          targetUsername: user.username,
        }));
        updateUrl("username", "");
      } else {
        setState((prev) => ({
          ...prev,
          updateMode: "other",
          targetUsername: queryUsername,
        }));
        userSearchUsername = queryUsername;
      }
    } else {
      if (permissions.canViewSelf) {
        setState((prev) => ({
          ...prev,
          updateMode: "self",
          targetUsername: user.username,
        }));
        userSearchUsername = user.username;
      } else if (permissions.canViewOther) {
        setState((prev) => ({
          ...prev,
          updateMode: "other",
          targetUsername: "",
        }));
        userSearchUsername = "";
      }
    }
    if (userSearchUsername && !refs.hasFetchedUserData.current) {
      userSearch.fetchUserData(userSearchUsername);
      refs.hasFetchedUserData.current = true;
    }
    // eslint-disable-next-line
  }, [user, isLoadingAuth]);

  // Focus management effect
  useEffect(() => {
    if (userSearch.isLoading) return;

    if (state.updateMode === "other") {
      refs.usernameInputRef.current?.focus();
    }
  }, [state.updateMode, userSearch.isLoading]);

  // Atualiza a URL
  const updateUrlWithUsername = (username) => {
    updateUrl("username", username);
  };

  // Alternância de modo
  const handleUpdateModeChange = (mode) => {
    setState((prev) => ({
      ...prev,
      manualModeChange: true,
      updateMode: mode,
    }));
    clearError();
    if (mode === "self" && user) {
      setState((prev) => ({
        ...prev,
        targetUsername: user.username,
      }));
      updateUrlWithUsername("");
      userSearch.fetchUserData(user.username);
    } else {
      setState((prev) => ({
        ...prev,
        targetUsername: "",
        userData: null,
      }));
      updateUrlWithUsername("");
      setTimeout(() => {
        refs.usernameInputRef.current?.focus();
      }, 100);
    }
  };

  // Formata datas
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  // Dias até expiração da senha
  const getDaysUntilExpiration = (expirationDate) => {
    const now = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Renderiza aviso de expiração de senha
  const renderPasswordStatus = (expirationDate) => {
    const daysUntilExpiration = getDaysUntilExpiration(expirationDate);
    const isExpired =
      daysUntilExpiration <=
      settings.profile.PASSWORD_EXPIRED_DAYS_TO_SHOW_EXPIRED;
    const isWarning =
      daysUntilExpiration <=
      settings.profile.PASSWORD_EXPIRED_DAYS_TO_SHOW_WARNING;

    if (!isExpired && !isWarning) return null;
    return (
      <PasswordExpirationAlert
        daysUntilExpiration={daysUntilExpiration}
        type={isExpired ? "error" : "warning"}
        title={
          isExpired
            ? texts.profile.message.warning.passwordExpired.errorTitle
            : texts.profile.message.warning.passwordExpired.warningTitle
        }
        message={texts.profile.message.warning.passwordExpired.message}
        daysText={texts.profile.message.warning.passwordExpired.days}
        buttonText={texts.profile.message.warning.passwordExpired.button}
        onButtonClick={() => {
          setState((prev) => ({ ...prev, showContent: false }));
          router.push(settings.profile.PASSWORD_EXPIRED_REDIRECT);
        }}
      />
    );
  };

  // Memo dos botões de modo
  const ModeSwitchButtons = useMemo(() => {
    if (!state.canViewOthers || !state.showContent) return null;
    return (
      <SwitchMode
        canUpdateSelf={state.canViewSelf}
        updateMode={state.updateMode}
        handleUpdateModeChange={handleUpdateModeChange}
        disabled={userSearch.isLoading}
        textSelf={texts.profile.button.self}
        textOther={texts.profile.button.other}
      />
    );
  }, [
    state.canViewOthers,
    state.canViewSelf,
    state.updateMode,
    state.showContent,
    userSearch.isLoading,
  ]);

  // Memo do campo de busca
  const UserSearchField = useMemo(() => {
    if (
      state.updateMode !== "other" ||
      !state.canViewOthers ||
      !state.showContent
    )
      return null;
    return (
      <UserSearchComponent
        setState={setState}
        error={fieldErrors.username}
        setError={setError}
        disabled={userSearch.isLoading}
        inputRef={refs.usernameInputRef}
        targetUsername={state.targetUsername}
        updateMode={state.updateMode}
        user={user}
        userSearch={userSearch}
        texts={texts.profile}
        updateUrlWithUsername={updateUrlWithUsername}
      />
    );
  }, [
    state.updateMode,
    state.canViewOthers,
    state.showContent,
    userSearch,
    state.targetUsername,
    user,
  ]);

  // Memo dos dados do usuário
  const UserInfoContent = useMemo(() => {
    if (!userSearch.userFound || !state.showContent || !state.userData)
      return null;

    const fields = [
      {
        label: texts.profile.label.username,
        value: state.userData.username,
        format: null,
      },
    ];

    if (state.updateMode === "self") {
      fields.push({
        label: texts.profile.label.email,
        value: state.userData.email,
        format: null,
      });
    }

    fields.push(
      {
        label: texts.profile.label.createdAt,
        value: state.userData.created_at,
        format: formatDate,
      },
      {
        label: texts.profile.label.updatedAt,
        value: state.userData.updated_at,
        format: formatDate,
      },
      {
        label: texts.profile.label.passwordExpires,
        value: state.userData.password_expires_at,
        format: formatDate,
      },
    );

    return (
      <UserInfo
        userData={state.userData}
        fields={fields}
        texts={texts.profile}
        onEditClick={() => {
          setState((prev) => ({ ...prev, showContent: false }));
          const baseUrl = settings.profile.REDIRECT_TO_UPDATE_USER;
          if (state.updateMode === "other") {
            router.push(`${baseUrl}?username=${state.userData.username}`);
          } else {
            router.push(baseUrl);
          }
        }}
        renderPasswordStatus={
          state.updateMode === "self" && state.userData?.password_expires_at
            ? renderPasswordStatus(state.userData.password_expires_at)
            : null
        }
      />
    );
  }, [
    userSearch.userFound,
    state.showContent,
    state.updateMode,
    state.userData,
  ]);

  return (
    <PageLayout
      title={texts.profile.title}
      description="Visualize e gerencie seu perfil"
    >
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {texts.profile.title}
        </h2>
      </div>

      {ModeSwitchButtons && (
        <div className="flex justify-center w-full">{ModeSwitchButtons}</div>
      )}

      {UserSearchField && (
        <div className="flex justify-center w-full">{UserSearchField}</div>
      )}

      <Alert type="error" show={!!error}>
        {error}
      </Alert>
      {UserInfoContent}
    </PageLayout>
  );
}
