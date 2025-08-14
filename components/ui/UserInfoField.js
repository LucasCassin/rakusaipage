import React from "react";

const UserInfoField = ({ label, value, formatValue }) => {
  return (
    <p className="text-sm text-gray-600">
      <span className="font-medium">{label}</span>{" "}
      {formatValue ? formatValue(value) : value}
    </p>
  );
};

UserInfoField.displayName = "UserInfoField";

export default UserInfoField;
