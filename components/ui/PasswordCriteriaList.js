import React from "react";
import PasswordCriterionItem from "components/ui/PasswordCriterionItem";

/**
 * Componente de lista de critérios de senha
 */
const PasswordCriteriaList = React.memo(
  ({
    criteria,
    textTitle,
    textLength,
    textLowercase,
    textUppercase,
    textNumber,
    textSpecial,
  }) => (
    <div className="mt-2 space-y-2 text-sm">
      <p className="text-gray-700 font-medium">{textTitle}</p>
      <ul className="space-y-1 text-gray-600">
        <PasswordCriterionItem isValid={criteria.length} text={textLength} />
        <PasswordCriterionItem
          isValid={criteria.lowercase}
          text={textLowercase}
        />
        <PasswordCriterionItem
          isValid={criteria.uppercase}
          text={textUppercase}
        />
        <PasswordCriterionItem isValid={criteria.number} text={textNumber} />
        <PasswordCriterionItem isValid={criteria.special} text={textSpecial} />
      </ul>
    </div>
  ),
);

PasswordCriteriaList.displayName = "PasswordCriteriaList";

export default PasswordCriteriaList;
