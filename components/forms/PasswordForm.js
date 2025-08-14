import React, { useState } from "react";
import FormInput from "components/forms/FormInput";
import Button from "components/ui/Button";
import PasswordVisibilityToggle from "components/ui/PasswordVisibilityToggle";
import PasswordGeneratorButton from "components/ui/PasswordGeneratorButton";
import PasswordCriteriaList from "components/ui/PasswordCriteriaList";

const PasswordForm = React.memo(
  ({
    onSubmit,
    fieldErrors,
    setFieldErrors,
    disabled,
    passwordHook,
    texts,
    inputRef,
    updateField = null,
    textButton = "",
    showSubmitButton = true,
    showGeneratePasswordButton = true,
  }) => {
    const [showPassword, setShowPassword] = useState(false);
    const textPasswordCriteria = {
      ...(texts.passwordCriteria || {}),
      error: texts.message.error.criteria || "",
    };
    const handleGeneratePassword = (e) => {
      e.preventDefault();
      const np = passwordHook.generateRandomPassword();
      setShowPassword(true);
      setFieldErrors((prev) => ({ ...prev, password: "" }));
      if (updateField) {
        updateField("password", np);
      }
    };

    const handleBlur = () => {
      if (
        passwordHook.useValidatePassword &&
        passwordHook.password &&
        !passwordHook.isValid
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          password: textPasswordCriteria.error,
        }));
      }
    };

    const handleChange = (e) => {
      passwordHook.updatePassword(e.target.value);
      setFieldErrors((prev) => ({ ...prev, password: "" }));
      if (updateField) {
        updateField("password", e.target.value);
      }
    };

    return (
      <div className="w-full space-y-4">
        <div className="w-full">
          <div className="flex w-full">
            <div className="flex-1 min-w-0">
              <FormInput
                id="password"
                type={showPassword ? "text" : "password"}
                value={passwordHook.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={texts.placeholder.password}
                error={fieldErrors.password}
                disabled={disabled}
                inputRef={inputRef}
                className={showGeneratePasswordButton ? "" : "rounded-r-md"}
                aria-required="true"
                aria-describedby="password-error password-criteria"
                rightElement={
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <PasswordVisibilityToggle
                      showPassword={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      disabled={disabled}
                    />
                  </div>
                }
              />
            </div>
            {showGeneratePasswordButton && (
              <div className="flex-shrink-0">
                <PasswordGeneratorButton
                  onClick={handleGeneratePassword}
                  texts={texts.button.generatePassword}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </div>

        {passwordHook.useValidatePassword && (
          <div className="w-full">
            <PasswordCriteriaList
              criteria={passwordHook.criteria}
              textTitle={textPasswordCriteria.title}
              textLength={textPasswordCriteria.length}
              textLowercase={textPasswordCriteria.lowercase}
              textUppercase={textPasswordCriteria.uppercase}
              textNumber={textPasswordCriteria.number}
              textSpecial={textPasswordCriteria.special}
            />
          </div>
        )}

        {showSubmitButton && (
          <div className="w-full">
            <Button
              type="submit"
              onClick={onSubmit}
              disabled={disabled}
              variant="primary"
              className="w-full"
            >
              {textButton}
            </Button>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.error === nextProps.error &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.passwordHook === nextProps.passwordHook &&
      prevProps.textButton === nextProps.textButton &&
      prevProps.updateField === nextProps.updateField &&
      prevProps.texts === nextProps.texts &&
      prevProps.showGeneratePasswordButton ===
        nextProps.showGeneratePasswordButton
    );
  },
);

PasswordForm.displayName = "PasswordForm";

export default PasswordForm;
