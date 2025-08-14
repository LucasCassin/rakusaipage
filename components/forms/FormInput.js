import React from "react";

/**
 * Componente reutilizável para inputs de formulário
 */
const FormInput = React.memo(
  ({
    id,
    name,
    type = "text",
    placeholder,
    value,
    onChange,
    onBlur,
    error,
    disabled = false,
    className = "",
    inputRef = null,
    rightElement = null,
    leftElement = null,
    required = false,
    onKeyDown = null,
  }) => (
    <div>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div
        className={`relative ${rightElement || leftElement ? "flex items-stretch" : ""}`}
      >
        {leftElement && leftElement}
        <div
          className={
            rightElement || leftElement ? "relative flex-grow" : "relative"
          }
        >
          <input
            ref={inputRef}
            id={id}
            name={name}
            type={type}
            className={`appearance-none relative block w-full px-3 py-2 border ${
              error ? "border-red-300" : "border-gray-300"
            } placeholder-gray-500 text-gray-900 ${
              rightElement
                ? "rounded-l-md pr-10"
                : leftElement
                  ? "rounded-md pl-10"
                  : "rounded-md"
            } focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            onKeyDown={onKeyDown}
          />
        </div>
        {rightElement && rightElement}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  ),
);

FormInput.displayName = "FormInput";

export default FormInput;
