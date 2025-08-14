import React from "react";

/**
 * Componente para exibir um item de critério de senha
 */
const PasswordCriterionItem = React.memo(({ isValid, text }) => (
  <li className="flex items-center space-x-2">
    {isValid ? (
      <svg
        className="h-4 w-4 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ) : (
      <svg
        className="h-4 w-4 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    )}
    <span className={isValid ? "text-green-600" : "text-gray-500"}>{text}</span>
  </li>
));

PasswordCriterionItem.displayName = "PasswordCriterionItem";

export default PasswordCriterionItem;
