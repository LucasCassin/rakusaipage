import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiX } from "react-icons/fi";
import Spinner from "components/ui/Spinner";
import TextareaAutosize from "react-textarea-autosize";

const CommentForm = ({
  onSubmit,
  initialContent = "",
  placeholder = "Adicione um comentário...",
  onCancel,
  isSubmitting,
  onFocus,
  content: controlledContent,
  onContentChange: onControlledContentChange,
}) => {
  const [internalContent, setInternalContent] = useState(initialContent);
  const textareaRef = useRef(null);

  const isControlled = controlledContent !== undefined;
  const content = isControlled ? controlledContent : internalContent;
  const setContent = isControlled
    ? onControlledContentChange
    : setInternalContent;

  useEffect(() => {
    if (onCancel) {
      textareaRef.current?.focus();
    }
  }, [onCancel]);

  useEffect(() => {
    if (!isControlled) {
      setInternalContent(initialContent);
    }
  }, [initialContent, isControlled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const success = await onSubmit(content);
    if (success && !isControlled) {
      setContent("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mt-2 relative w-full flex items-center border-2 border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-rakusai-purple focus-within:border-transparent transition-all duration-200">
        <TextareaAutosize
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full font-thin text-sm flex-grow p-1 pl-4 bg-transparent border-0 focus:ring-0 resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          minRows={1}
          maxRows={5}
          disabled={isSubmitting}
          onFocus={onFocus}
        />
        <div className="flex items-center gap-1 pr-2">
          {isSubmitting ? (
            <div className="p-2">
              {" "}
              <Spinner size="4" />{" "}
            </div>
          ) : (
            <>
              {(onCancel || content) && (
                <button
                  type="button"
                  onClick={onCancel || (() => setContent(""))}
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
