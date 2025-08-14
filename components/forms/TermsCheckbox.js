import React from "react";

/**
 * Componente de checkbox para aceitação de termos de uso
 */
export default function TermsCheckbox({
  checked,
  onChange,
  disabled,
  onOpenTerms,
  onOpenPrivacy,
  texts,
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-required="true"
          aria-describedby="terms-error"
        />
        <label
          htmlFor="acceptTerms"
          className="ml-2 block text-sm text-gray-900"
        >
          {texts.terms.label}{" "}
          <button
            type="button"
            onClick={onOpenTerms}
            className="text-blue-600 hover:text-blue-500 font-medium"
            disabled={disabled}
          >
            {texts.terms.terms}
          </button>{" "}
          {texts.terms.and}{" "}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-blue-600 hover:text-blue-500 font-medium"
            disabled={disabled}
          >
            {texts.terms.privacy}
          </button>
        </label>
      </div>
      <div
        id="terms-error"
        aria-live="polite"
        className="mt-1 text-sm text-red-600"
      ></div>
    </div>
  );
}
