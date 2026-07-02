import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/**
 * Combobox de seleção múltipla genérico, com a mesma altura dos demais campos
 * do formulário de filtros (um `<select multiple>` nativo ficaria mais alto
 * que os outros inputs). Nenhum item selecionado == "todos".
 */
export default function MultiSelectFilter({
  items,
  selectedIds,
  onChange,
  allLabel,
  selectedLabel,
  emptyLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleItem = (itemId) => {
    if (selectedIds.includes(itemId)) {
      onChange(selectedIds.filter((id) => id !== itemId));
    } else {
      onChange([...selectedIds, itemId]);
    }
  };

  const label =
    selectedIds.length === 0 ? allLabel : selectedLabel(selectedIds.length);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left truncate"
        aria-expanded={isOpen}
      >
        <span className="truncate">{label}</span>
        <FiChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg py-1">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-1.5 text-sm font-medium text-rakusai-purple hover:bg-gray-50"
          >
            {allLabel}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleItem(item.id)}
              />
              {item.name}
            </label>
          ))}
          {items.length === 0 && (
            <p className="px-3 py-1.5 text-sm text-gray-400">{emptyLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
