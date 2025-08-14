import React from "react";

/**
 * Componente reutilizável para alertas (erro, sucesso, etc)
 */
const Alert = React.memo(({ type = "error", children }) => {
  if (!children) return null;

  const alertStyles = {
    error: "bg-red-50 border border-red-400 text-red-700",
    success: "bg-green-50 border border-green-400 text-green-700",
    warning: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    info: "bg-blue-50 border border-blue-400 text-blue-700",
  };

  return (
    <div
      className={`${alertStyles[type]} px-4 py-3 rounded relative`}
      role="alert"
    >
      <span className="block sm:inline">{children}</span>
    </div>
  );
});

Alert.displayName = "Alert";

export default Alert;
