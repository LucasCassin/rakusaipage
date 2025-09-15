import React, { useState, useEffect } from "react";
import { settings } from "config/settings.js";
import availableFeatures from "models/user-features.js";
import ToggleFeaturesList from "components/ui/ToggleFeaturesList";
import Button from "components/ui/Button";
import Select from "react-select";

import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "tailwind.config.js";
const fullConfig = resolveConfig(tailwindConfig);
const themeColors = fullConfig.theme.colors;

export default function FeatureSelectionForm({
  onSearch,
  isLoading,
  initialFeatures = [],
  onParamsChange,
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [featuresList, setFeaturesList] = useState(() =>
    Array.from(availableFeatures)
      .sort()
      .map((feature) => ({
        id: feature,
        name: feature,
        selected: initialFeatures.includes(feature),
      })),
  );

  useEffect(() => {
    setFeaturesList((currentList) =>
      currentList.map((f) => ({
        ...f,
        selected: initialFeatures.includes(f.id),
      })),
    );
  }, [initialFeatures]);

  const handleGroupChange = (selectedOption) => {
    const groupFeatures = selectedOption
      ? JSON.parse(selectedOption.value)
      : [];
    setSelectedGroup(selectedOption);

    setFeaturesList((currentList) =>
      currentList.map((f) => ({
        ...f,
        selected: groupFeatures.includes(f.id),
      })),
    );

    if (onParamsChange) onParamsChange();
  };

  const handleFeatureToggle = (featureId) => {
    setSelectedGroup("");
    setFeaturesList((currentList) =>
      currentList.map((f) =>
        f.id === featureId ? { ...f, selected: !f.selected } : f,
      ),
    );

    if (onParamsChange) onParamsChange();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selected = featuresList.filter((f) => f.selected).map((f) => f.id);
    onSearch(selected);
  };

  const selectedCount = featuresList.filter((f) => f.selected).length;

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      fontSize: "0.875rem",
      fontWeight: "400",
      borderWidth: "1px",
      // MUDANÇA: Usando colchetes para acessar a cor com hífen
      borderColor: state.isFocused
        ? themeColors["rakusai-purple"]
        : themeColors.gray[300],
      boxShadow: state.isFocused
        ? `0 0 0 1px ${themeColors["rakusai-purple"]}`
        : provided.boxShadow,
      "&:hover": {
        borderColor: themeColors["rakusai-purple"],
      },
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: "0.875rem",
      fontWeight: "500",
      // MUDANÇA: Usando colchetes para acessar as cores com hífen
      backgroundColor: state.isSelected
        ? themeColors["rakusai-purple"]
        : state.isFocused
          ? themeColors["rakusai-pink-light"]
          : provided.backgroundColor,
      color:
        state.isSelected || state.isFocused
          ? themeColors.white
          : provided.color,
      "&:active": {
        ...provided["&:active"],
        backgroundColor: themeColors["rakusai-purple"],
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: "0.875rem",
      fontWeight: "400",
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "0.875rem",
      fontWeight: "400",
    }),
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white rounded-lg shadow-md border border-gray-200 space-y-6"
    >
      <div>
        <label
          htmlFor="group-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Buscar por Grupos Predefinidos
        </label>
        <Select
          id="group-select"
          options={settings.findusersbyfeatures.map((group) => ({
            value: JSON.stringify(group.features),
            label: group.name,
          }))}
          value={selectedGroup}
          onChange={handleGroupChange}
          placeholder="Selecione um grupo..."
          isClearable
          isDisabled={isLoading}
          styles={customSelectStyles}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar por Features Individuais
        </label>
        <ToggleFeaturesList
          features={featuresList}
          onChange={handleFeatureToggle}
          disabled={isLoading}
        />
      </div>

      <div>
        <Button
          type="submit"
          disabled={isLoading || selectedCount === 0}
          className="w-full"
        >
          {isLoading ? "Buscando..." : "Buscar Usuários"}
        </Button>
      </div>
    </form>
  );
}
