import { useCallback } from "react";
import Switch from "./Switch";

export default function ToggleFeaturesList({
  features,
  onChange,
  disabled,
  className = "",
}) {
  const handleFeatureChange = useCallback(
    (feature) => {
      if (!disabled) {
        onChange(feature);
      }
    },
    [disabled, onChange],
  );

  return (
    <div
      className={`bg-gray-50 rounded-lg border border-gray-300 p-0.5 ${className}`}
    >
      <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-track-transparent p-1">
        <div className="grid grid-cols-1 gap-3 pr-2">
          {features.map((feature) => {
            const isSelected = feature.selected;
            return (
              <div
                key={feature.id}
                className="flex items-center justify-between"
              >
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isSelected
                      ? "bg-rakusai-purple-light text-rakusai-purple"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {feature.name}
                </span>
                <Switch
                  checked={isSelected}
                  onChange={() => handleFeatureChange(feature.id)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
