import React from "react";
import FormInput from "components/forms/FormInput";
import Button from "components/ui/Button";
import PasswordForm from "components/forms/PasswordForm";
import TermsCheckbox from "components/forms/TermsCheckbox";
import Link from "next/link";
import { settings } from "config/settings.js";
const { REQUIRE_TERMS } = settings.register;

const RegisterForm = React.memo(
  ({
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
    texts,
    usernameInputRef,
    emailInputRef,
    passwordInputRef,
    updateField,
  }) => {
    return (
      <div className="w-full space-y-4">
        <FormInput
          id="username"
          name="username"
          type="text"
          placeholder={texts.placeholder.username}
          value={formData.username}
          onChange={handleChange}
          error={fieldErrors.username}
          disabled={isLoading || !user}
          inputRef={usernameInputRef}
          aria-required="true"
          aria-describedby="username-error"
        />

        <FormInput
          id="email"
          name="email"
          type="email"
          placeholder={texts.placeholder.email}
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          disabled={isLoading || !user}
          inputRef={emailInputRef}
          aria-required="true"
          aria-describedby="email-error"
        />

        <PasswordForm
          onSubmit={handleSubmit}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          disabled={isLoading || !user}
          passwordHook={passwordHook}
          texts={texts}
          inputRef={passwordInputRef}
          showSubmitButton={false}
          updateField={updateField}
        />

        {/* Aceitação de termos */}
        {REQUIRE_TERMS && (
          <TermsCheckbox
            checked={formData.acceptTerms}
            onChange={handleChange}
            disabled={isLoading}
            onOpenTerms={handleOpenTerms}
            onOpenPrivacy={handleOpenPrivacy}
            texts={texts}
          />
        )}

        {/* Botão de submissão */}
        <div className="w-full">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid() || !user}
            variant="primary"
            className="w-full"
          >
            {isLoading ? texts.button.loading : texts.button.submit}
          </Button>
        </div>

        {/* Link para login */}
        {!user && (
          <div className="text-sm text-center">
            {isLoading ? (
              <span className="font-medium text-blue-600 opacity-50 cursor-not-allowed">
                {texts.loginLink}
              </span>
            ) : (
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {texts.loginLink}
              </Link>
            )}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.formData === nextProps.formData &&
      prevProps.fieldErrors === nextProps.fieldErrors &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.user === nextProps.user &&
      prevProps.passwordHook === nextProps.passwordHook &&
      prevProps.isFormValid === nextProps.isFormValid &&
      prevProps.updateField === nextProps.updateField
    );
  },
);

RegisterForm.displayName = "RegisterForm";

export default RegisterForm;
