import React from "react";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";

const PasswordExpirationAlert = ({
  daysUntilExpiration,
  type,
  title,
  message,
  daysText,
  buttonText,
  onButtonClick,
}) => {
  return (
    <Alert type={type}>
      <p className="font-medium">{title}</p>
      <p className="text-sm">
        {message} {daysUntilExpiration} {daysText}
        <Button type="button" onClick={onButtonClick} variant="link">
          {buttonText}
        </Button>
      </p>
    </Alert>
  );
};

PasswordExpirationAlert.displayName = "PasswordExpirationAlert";

export default PasswordExpirationAlert;
