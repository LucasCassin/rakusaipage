import React from "react"; // <-- Removido 'useState'
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

/**
 * Um contêiner "sanfona" (accordion) para as seções da paleta.
 * MUDANÇA: Este componente agora é "controlado" (não tem estado interno).
 */
export default function PaletteSection({ title, children, isOpen, onToggle }) {
  // const [isOpen, setIsOpen] = useState(startOpen); // <-- REMOVIDO

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        type="button"
        className="flex justify-between items-center w-full p-3 text-left"
        onClick={onToggle} // <-- MUDANÇA
      >
        <h4 className="font-bold text-gray-800">{title}</h4>
        {isOpen ? ( // <-- Usa a prop 'isOpen'
          <FiChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <FiChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isOpen && ( // <-- Usa a prop 'isOpen'
        <div className="p-3 border-t border-gray-200">
          <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
