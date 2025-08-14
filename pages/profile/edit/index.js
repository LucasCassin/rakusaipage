import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { mutate } from "swr";
import { USER_ENDPOINT } from "src/contexts/AuthContext.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { texts } from "src/utils/texts.js";
import Alert from "components/ui/Alert";
import { useUserSearch } from "src/hooks/useUserSearch";
import UserSearchComponent from "components/forms/UserSearchComponent";
import SwitchMode from "components/forms/SwitchMode";
import ProfileEditForm from "components/forms/ProfileEditForm";
import { useMessage } from "src/hooks/useMessage";
import { useSetFieldError } from "src/hooks/useSetFieldError";
import PageLayout from "components/layouts/PageLayout";
import useUrlManager from "src/hooks/useUrlManager";

export default function EditProfile() {
  // ===== Hooks and Contexts =====
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const {
    error,
    setError,
    clearError,
    success,
    setSuccess,
    clearSuccess,
    clearAll,
  } = useMessage();
  const { updateUrl, getParamValue } = useUrlManager();
  const { setFieldErrors, clearAllFieldError, fieldErrors, fieldErrorMapping } =
    useSetFieldError({
      fieldErrorMapping: {
        username: texts.profileEdit.errorMapping.username,
        email: texts.profileEdit.errorMapping.email,
      },
    });

  // ===== Refs =====
  const refs = {
    username: useRef(null),
    email: useRef(null),
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
    canUpdateOthers: false,
    canUpdateSelf: false,
    canUpdateFieldsSelf: false,
    canUpdateFeatures: false,
    canUpdateFeaturesSelf: false,
    canUpdateFeaturesOther: false,
    formData: {
      username: "",
      email: "",
      features: [],
    },
  });

  // ===== Custom Hooks =====
  const userSearch = useUserSearch({
    resetCallback: () => {
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, username: "", email: "", features: [] },
      }));
    },
    setFieldErrorsHandlers: {
      setFieldErrors,
      clearAllFieldError,
      fieldErrorMapping,
    },
    onSuccessCallback: (data) => {
      setState((prev) => ({
        ...prev,
        userData: data,
        formData: {
          ...prev.formData,
          features: data.features || [],
        },
      }));
      setTimeout(() => {
        refs.targetUserSearch.current?.focus();
      }, 100);
    },
    messageHandlers: {
      setError,
      clearError,
    },
  });

  // ===== URL and Query Parameters =====
  const queryUsername = getParamValue("username");

  // ===== Handlers =====
  // Form state handlers
  const resetFormState = useCallback(
    (userFound = false, clearFields = true) => {
      clearError();
      userSearch.setUserFound(userFound);
      setState((prev) => ({
        ...prev,
        formData: {
          ...prev.formData,
          username: clearFields ? "" : prev.formData.username,
          email: clearFields ? "" : prev.formData.email,
          features: clearFields ? [] : prev.formData.features,
        },
      }));
    },
    [userSearch, clearError],
  );

  // URL update handler
  const updateUrlWithUsername = useCallback(
    (username) => {
      updateUrl("username", username, true, false, true);
    },
    [updateUrl],
  );

  // Form submission handler
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setState((prev) => ({ ...prev, isUpdating: true }));
      clearAll();

      if (!state.targetUsername) {
        setError(texts.profileEdit.message.error.noUser);
        return;
      }

      const updatedFields = {};
      if (
        state.formData.username !== state.targetUsername &&
        state.formData.username !== "" &&
        state.canUpdateFieldsSelf
      ) {
        updatedFields.username = state.formData.username;
      }
      if (state.formData.email !== "" && state.canUpdateFieldsSelf) {
        updatedFields.email = state.formData.email;
      }
      if (
        (state.updateMode === "self" && state.canUpdateFeaturesSelf) ||
        (state.updateMode === "other" && state.canUpdateFeaturesOther)
      ) {
        const currentFeatures =
          state.updateMode === "self"
            ? user?.features || []
            : state.userData?.features || [];
        const newFeatures = state.formData.features || [];
        const hasFeatureChanges =
          currentFeatures.length !== newFeatures.length ||
          currentFeatures.some((feature) => !newFeatures.includes(feature)) ||
          newFeatures.some((feature) => !currentFeatures.includes(feature));

        if (hasFeatureChanges) {
          updatedFields.features = state.formData.features;
        }
      }

      if (Object.keys(updatedFields).length === 0) {
        setError(texts.profileEdit.message.error.noChanges);
        setTimeout(() => {
          clearError();
          setState((prev) => ({ ...prev, isUpdating: false }));
        }, 2000);
        return;
      }

      userSearch.setIsLoading(true);
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.USERS}/${state.targetUsername}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFields),
        },
      );

      await handleApiResponse({
        response,
        router,
        setError,
        setFieldErrors: setFieldErrors,
        fieldErrorMapping: fieldErrorMapping,
        onSuccess: async () => {
          userSearch.setUserFound(false);
          setSuccess(texts.profileEdit.message.success);
          if (state.updateMode === "self") {
            await mutate(USER_ENDPOINT);
          }
          setTimeout(() => {
            if (state.updateMode === "self") {
              setState((prev) => ({ ...prev, showContent: false }));
              router.push(settings.updateUser.REDIRECT_AFTER_UPDATE);
            } else {
              clearSuccess();
              setState((prev) => ({
                ...prev,
                isUpdating: false,
              }));
              userSearch.fetchUserData(state.targetUsername);
            }
          }, 2000);
        },
        onError: () => {
          setTimeout(() => {
            resetFormState(false, false);
            userSearch.setIsLoading(false);
            setState((prev) => ({ ...prev, isUpdating: false }));
          }, 1000);
        },
      });
    },
    [
      state.targetUsername,
      state.formData,
      state.canUpdateFeatures,
      state.updateMode,
      userSearch,
      resetFormState,
      router,
      setError,
      clearError,
      clearSuccess,
      setSuccess,
    ],
  );

  // Mode change handler
  const handleUpdateModeChange = useCallback(
    (mode) => {
      setState((prev) => ({
        ...prev,
        updateMode: mode,
        targetUsername: mode === "self" ? user?.username : "",
      }));

      resetFormState();

      if (mode === "self") {
        updateUrlWithUsername("");
        setState((prev) => ({
          ...prev,
          displayTitle: texts.profileEdit.title,
        }));
      }
      refs.hasFetchedUserData.current = false;
    },
    [user, resetFormState, updateUrlWithUsername],
  );

  // ===== Effects =====
  // Initial setup and permissions effect
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.profileEdit.message.error.notAuthenticated);
      setState((prev) => ({ ...prev, showContent: false }));
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 2000);
      return;
    }

    const permissions = {
      canUpdateFeaturesSelf: user.features?.includes(
        settings.updateUser.FEATURE_UPDATE_FEATURES_SELF,
      ),
      canUpdateFeaturesOther: user.features?.includes(
        settings.updateUser.FEATURE_UPDATE_FEATURES_OTHER,
      ),
      canUpdateFieldsSelf: user.features?.includes(
        settings.updateUser.FEATURE_UPDATE_SELF,
      ),
      canReadOther: user.features?.includes(
        settings.updateUser.FEATURE_READ_OTHER,
      ),
    };

    const canUpdateSelf =
      permissions.canUpdateFeaturesSelf || permissions.canUpdateFieldsSelf;
    const canUpdateOther =
      permissions.canUpdateFeaturesOther && permissions.canReadOther;

    if (!canUpdateSelf && !canUpdateOther) {
      setError(texts.profileEdit.message.error.noPermission);
      setState((prev) => ({ ...prev, showContent: false }));
      router.push(settings.updateUser.FORBIDDEN_REDIRECT);
      return;
    }

    const newState = {
      canUpdateSelf,
      canUpdateOthers: canUpdateOther,
      canUpdateFeatures:
        permissions.canUpdateFeaturesSelf || permissions.canUpdateFeaturesOther,
      canUpdateFeaturesSelf: permissions.canUpdateFeaturesSelf,
      canUpdateFeaturesOther: permissions.canUpdateFeaturesOther,
      canUpdateFieldsSelf: permissions.canUpdateFieldsSelf,
      showContent: true,
    };

    if (queryUsername) {
      if (!canUpdateOther) {
        setState((prev) => ({ ...prev, showContent: false }));
        setError(texts.profileEdit.message.error.noPermissionOther);
        setTimeout(() => {
          // Tenta voltar para a página anterior ou vai para /profile
          if (window.history.length > 2) {
            router.back();
          } else {
            router.push("/profile");
          }
        }, 2000);
        return;
      }
      // Se tem permissão, configura para edição de outro usuário
      if (queryUsername === user.username) {
        updateUrlWithUsername("");
      } else {
        newState.updateMode = "other";
        newState.targetUsername = queryUsername;
      }
    } else if (!canUpdateSelf) {
      newState.updateMode = "other";
    } else if (!queryUsername && canUpdateSelf) {
      newState.updateMode = "self";
      newState.targetUsername = user.username;
      newState.formData = {
        username: user.username || "",
        email: "",
        features: user.features || [],
      };
    }

    setState((prev) => ({ ...prev, ...newState }));
  }, [user, isLoadingAuth, queryUsername, router, updateUrlWithUsername]);

  // Effect para buscar dados do usuário
  useEffect(() => {
    if (
      !state.showContent ||
      isLoadingAuth ||
      refs.hasFetchedUserData.current ||
      userSearch.isLoading
    )
      return;
    if (!user) return;
    if (state.updateMode === "self" && !queryUsername) {
      userSearch.fetchUserData(user.username);
      refs.hasFetchedUserData.current = true;
    } else if (
      state.updateMode === "other" &&
      queryUsername &&
      !userSearch.userFound &&
      !userSearch.isLoading
    ) {
      userSearch.fetchUserData(queryUsername);
      refs.hasFetchedUserData.current = true;
    }
  }, [state.updateMode, queryUsername, isLoadingAuth]);

  // Focus management effect
  useEffect(() => {
    if (userSearch.isLoading) return;

    const shouldFocusUsername =
      state.updateMode === "other" && !userSearch.userFound;
    const shouldFocusEmail =
      (state.updateMode === "self" && !success) ||
      (state.updateMode === "other" && userSearch.userFound);

    if (shouldFocusUsername && refs.targetUserSearch.current) {
      refs.targetUserSearch.current.focus();
    } else if (shouldFocusEmail && refs.email.current) {
      refs.email.current.focus();
    }
  }, [
    state.updateMode,
    success,
    userSearch.isLoading,
    userSearch.userFound,
    refs.targetUserSearch,
    refs.email,
  ]);

  // ===== Component Renderers =====
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
        inputRef={refs.targetUserSearch}
        targetUsername={state.targetUsername}
        updateMode={state.updateMode}
        user={user}
        userSearch={userSearch}
        texts={texts.profileEdit}
        updateUrlWithUsername={updateUrlWithUsername}
      />
    );
  }, [
    state.isUpdating,
    refs.targetUserSearch,
    state.targetUsername,
    state.updateMode,
    user,
    userSearch,
    updateUrl,
    setState,
    state.showContent,
  ]);

  const ProfileEditFormContent = useMemo(() => {
    if (
      !state.showContent ||
      !(
        (state.updateMode === "self" && !success) ||
        (state.updateMode === "other" && userSearch.userFound)
      )
    ) {
      return null;
    }

    const handleFormDataChange = (newData) => {
      setState((prev) => {
        const newState = {
          ...prev,
          formData: {
            ...prev.formData,
            ...newData,
            features: newData.features || prev.formData.features,
          },
        };
        return newState;
      });
    };

    return (
      <ProfileEditForm
        onSubmit={handleSubmit}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        disabled={userSearch.isLoading || state.isUpdating || error}
        formData={state.formData}
        setFormData={handleFormDataChange}
        texts={texts.profileEdit}
        inputRefs={refs}
        textButton={
          userSearch.isLoading || state.isUpdating
            ? texts.profileEdit.button.loading
            : texts.profileEdit.button.update
        }
        showUsernameAndEmail={
          state.updateMode === "self" && state.canUpdateFieldsSelf
        }
        showFeatures={
          (state.updateMode === "self" && state.canUpdateFeaturesSelf) ||
          (state.updateMode === "other" && state.canUpdateFeaturesOther)
        }
      />
    );
  }, [
    state.updateMode,
    success,
    state.showContent,
    state.isUpdating,
    state.formData,
    userSearch.userFound,
    userSearch.isLoading,
    fieldErrors,
    handleSubmit,
    refs,
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
        textSelf={texts.profileEdit.button.self}
        textOther={texts.profileEdit.button.other}
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
      title={state.displayTitle || texts.profileEdit.title}
      description="Edite seu perfil"
    >
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          {state.displayTitle || texts.profileEdit.title}
        </h2>
      </div>

      {ModeSwitchButtons && (
        <div className="flex justify-center w-full">{ModeSwitchButtons}</div>
      )}

      {UserSearchField && (
        <div className="flex justify-center w-full">{UserSearchField}</div>
      )}

      <form className="mt-8 space-y-6 w-full" onSubmit={handleSubmit}>
        <Alert type="error" show={!!error}>
          {error}
        </Alert>

        <Alert type="success" show={!!success}>
          {success}
        </Alert>

        <div className="flex justify-center w-full">
          {ProfileEditFormContent}
        </div>
      </form>
    </PageLayout>
  );
}
