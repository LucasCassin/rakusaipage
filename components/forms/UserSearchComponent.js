import React, { useCallback } from "react";
import FormInput from "components/forms/FormInput";
import Button from "components/ui/Button";

// Campo de busca de usuário
const UserSearchComponent = React.memo(
  ({
    setState,
    error,
    setError,
    disabled,
    inputRef,
    targetUsername,
    updateMode,
    user,
    userSearch,
    texts,
    updateUrlWithUsername,
  }) => {
    const handleTargetUserSearch = useCallback(() => {
      if (!targetUsername) {
        setError(texts.message.error.searchError);
        return;
      }

      if (user?.username === targetUsername && updateMode === "other") {
        setError(texts.message.error.searchSelf);
        return;
      }

      setError("");
      updateUrlWithUsername(targetUsername);
      userSearch.fetchUserData(targetUsername);
      setState((prev) => ({
        ...prev,
        ...(prev.showPasswordContent !== undefined && {
          showPasswordContent: true,
        }),
      }));
    }, [
      targetUsername,
      updateMode,
      user,
      userSearch,
      updateUrlWithUsername,
      texts,
      setState,
    ]);

    const handleOnChange = useCallback(
      (e) => {
        setState((prev) => ({
          ...prev,
          targetUsername: e.target.value,
          ...(prev.showPasswordContent !== undefined && {
            showPasswordContent: false,
          }),
        }));
        userSearch.setFieldErrors((prev) => ({
          ...prev,
          username: "",
          ...(prev.password !== undefined && {
            password: "",
          }),
        }));
        setError("");
        userSearch.setUserFound(false);
      },
      [setState, userSearch],
    );

    return (
      <div className="flex w-full gap-4 items-center">
        <div className="flex-1">
          <FormInput
            id="username"
            type="text"
            value={targetUsername}
            onChange={handleOnChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTargetUserSearch();
              }
            }}
            placeholder={texts.placeholder.username}
            error={error}
            disabled={disabled}
            inputRef={inputRef}
            aria-required="true"
            aria-describedby="username-error"
          />
        </div>
        <div className="flex-shrink-0">
          <Button
            type="button"
            onClick={handleTargetUserSearch}
            disabled={disabled}
            variant="primary"
            className="whitespace-nowrap h-10"
          >
            {texts.button.search}
          </Button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.error === nextProps.error &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.targetUsername === nextProps.targetUsername &&
      prevProps.updateMode === nextProps.updateMode &&
      prevProps.user === nextProps.user &&
      prevProps.userSearch === nextProps.userSearch &&
      prevProps.texts === nextProps.texts &&
      prevProps.updateUrlWithUsername === nextProps.updateUrlWithUsername &&
      prevProps.setState === nextProps.setState
    );
  },
);

UserSearchComponent.displayName = "UserSearchComponent";

export default UserSearchComponent;
