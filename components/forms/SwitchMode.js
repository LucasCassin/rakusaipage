import React from "react";
import Button from "components/ui/Button";

const SwitchMode = React.memo(
  ({
    canUpdateSelf,
    updateMode,
    handleUpdateModeChange,
    disabled,
    textSelf,
    textOther,
  }) => {
    return (
      <div className="flex w-full gap-4 flex-col sm:flex-row">
        {canUpdateSelf && (
          <Button
            type="button"
            onClick={() => handleUpdateModeChange("self")}
            variant={updateMode === "self" ? "primary" : "secondary"}
            disabled={disabled}
            className="flex-1 flex items-center justify-center"
          >
            {textSelf}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => handleUpdateModeChange("other")}
          variant={updateMode === "other" ? "primary" : "secondary"}
          disabled={disabled}
          className="flex-1 flex items-center justify-center"
        >
          {textOther}
        </Button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.canUpdateSelf === nextProps.canUpdateSelf &&
      prevProps.updateMode === nextProps.updateMode &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.textSelf === nextProps.textSelf &&
      prevProps.textOther === nextProps.textOther
    );
  },
);

SwitchMode.displayName = "SwitchMode";

export default SwitchMode;
