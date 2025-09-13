import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiX } from "react-icons/fi"; // Ícones de Enviar e Cancelar
import Spinner from "components/ui/Spinner";

const CommentForm = ({
  onSubmit,
  initialContent = "",
  placeholder = "Adicione um comentário...",
  onCancel,
  isSubmitting,
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const success = await onSubmit(content);
    if (success && !initialContent) {
      setContent("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mt-2 relative w-full flex items-center border-2 border-gray-200 rounded-full bg-white focus-within:ring-2 focus-within:ring-rakusai-purple focus-within:border-transparent transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full font-thin text-sm flex-grow p-1 pl-4 bg-transparent border-0 focus:ring-0 resize-none outline-none"
          rows="1"
          disabled={isSubmitting} // O formulário inteiro é desabilitado
        />
        <div className="flex items-center gap-1 pr-2">
          {/* MUDANÇA: Renderização condicional dos botões ou do Spinner */}
          {isSubmitting ? (
            <div className="p-2">
              <Spinner size="4" />
            </div>
          ) : (
            <>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 text-gray-500 hover:text-red-600 rounded-full transition"
                  aria-label="Cancelar"
                >
                  <FiX size={16} />
                </button>
              )}
              <button
                type="submit"
                disabled={!content.trim()}
                className="p-2 text-gray-500 hover:text-blue-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Enviar comentário"
              >
                <FiSend size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
