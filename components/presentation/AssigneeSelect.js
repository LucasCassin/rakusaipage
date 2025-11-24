import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiCheck, FiX } from "react-icons/fi";
import UserAvatar from "components/ui/UserAvatar";

export default function AssigneeSelect({
  cast = [],
  selectedIds = [],
  onChange,
  maxLimit,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleToggleUser = (userId) => {
    const isSelected = selectedIds.includes(userId);
    let newSelectedIds;

    if (isSelected) {
      newSelectedIds = selectedIds.filter((id) => id !== userId);
    } else {
      if (selectedIds.length >= maxLimit) return;
      newSelectedIds = [...selectedIds, userId];
    }
    onChange(newSelectedIds);
  };

  const selectedUsers = cast.filter((u) => selectedIds.includes(u.id));
  const isLimitReached = selectedIds.length >= maxLimit;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Botão Principal (Trigger) */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full min-h-[42px] flex items-center justify-between 
          px-3 py-2 text-left bg-white border rounded-md shadow-sm 
          focus:outline-none focus:ring-1 focus:ring-rakusai-purple focus:border-rakusai-purple
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}
          ${isOpen ? "border-rakusai-purple ring-1 ring-rakusai-purple" : "border-gray-300"}
        `}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.length > 0 ? (
            selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rakusai-purple/10 text-rakusai-purple border border-rakusai-purple/20"
              >
                {user.username}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleUser(user.id);
                  }}
                  className="ml-1.5 hover:text-red-600 cursor-pointer"
                >
                  <FiX />
                </span>
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">Selecione usuários...</span>
          )}
        </div>
        <FiChevronDown
          className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {cast.length > 0 ? (
            <ul className="py-1 divide-y divide-gray-50">
              {cast.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                const isDisabled = !isSelected && isLimitReached;

                return (
                  <li
                    key={user.id}
                    onClick={() => !isDisabled && handleToggleUser(user.id)}
                    className={`
                      flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors
                      ${isSelected ? "bg-rakusai-purple/5" : "hover:bg-gray-50"}
                      ${isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <UserAvatar username={user.username} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-sm truncate font-medium ${isSelected ? "text-rakusai-purple" : "text-gray-700"}`}
                        >
                          {user.username}
                        </span>
                        {isDisabled && (
                          <span className="text-[10px] text-red-400 leading-tight">
                            Limite atingido
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <FiCheck className="h-5 w-5 text-rakusai-purple flex-shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Nenhum usuário no elenco.
            </div>
          )}

          {/* Footer com Info */}
          <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500 text-right">
            {selectedIds.length} de {maxLimit} selecionados
          </div>
        </div>
      )}
    </div>
  );
}
