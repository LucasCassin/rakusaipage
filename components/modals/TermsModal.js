import React from "react";
import { texts } from "src/utils/texts.js";
import Terms from "pages/public/terms";
import Privacy from "pages/public/privacy";
/**
 * Modal de Termos e Privacidade
 */
const TermsModal = React.memo(({ isOpen, onClose, activeTab, onTabChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-black/50 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex justify-between items-center z-10">
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "terms"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => onTabChange("terms")}
            >
              {texts.register.terms.termsContent.title}
            </button>
            <button
              className={`px-4 py-2 rounded ${
                activeTab === "privacy"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => onTabChange("privacy")}
            >
              {texts.register.terms.privacyContent.title}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-5rem)]">
          {activeTab === "terms" ? <Terms /> : <Privacy />}
        </div>
      </div>
    </div>
  );
});

TermsModal.displayName = "TermsModal";

export default TermsModal;
