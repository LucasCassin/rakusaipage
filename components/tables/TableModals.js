import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import { texts } from "src/utils/texts";

export default function TableModals({
  showDeleteModal,
  showAddModal,
  showDiscardModal,
  selectedRows,
  isEditing,
  newItem,
  selectedTable,
  onCloseDeleteModal,
  // onCloseAddModal,
  onCloseDiscardModal,
  onDeleteSelected,
  onSaveNew,
  onDiscardNew,
  onNewItemChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onDiscard,
  nameInputRef,
  deleteConfirmButtonRef,
  discardConfirmButtonRef,
  setSelectedRows,
}) {
  // Função auxiliar para limpar seleções e cancelar edições
  const handleClearAll = () => {
    if (typeof setSelectedRows === "function") {
      setSelectedRows(new Set());
    }
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  return (
    <>
      {/* Modal de ações em lote */}
      {(selectedRows.size > 0 || isEditing) && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[60%] bg-gray-900 rounded-full shadow-lg">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-700 text-white text-xs px-3 py-0.5 rounded-full">
                    {isEditing ? 1 : selectedRows.size}
                  </span>
                  <span className="text-sm text-gray-300">
                    {isEditing
                      ? texts.tables.message.editingItem
                      : texts.tables.message.selectedItens}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={onSave}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600/80 hover:bg-green-600 rounded-full"
                    >
                      {texts.tables.button.save}
                    </button>
                    <button
                      onClick={onCancel}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 rounded-full"
                    >
                      {texts.tables.button.cancel}
                    </button>
                  </>
                ) : (
                  <>
                    {selectedRows.size === 1 && (
                      <button
                        onClick={onEdit}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 rounded-full"
                      >
                        {texts.tables.button.edit}
                      </button>
                    )}
                    <button
                      onClick={onDelete}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-full"
                    >
                      {texts.tables.button.delete}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-500/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {texts.tables.message.confirmation.deleteTitle}
              </h3>
              <Button
                onClick={onCloseDeleteModal}
                variant="link"
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {texts.tables.message.confirmation.delete} {selectedRows.size}
              {selectedRows.size !== 1 ? " itens" : " item"}?{" "}
              {texts.tables.message.confirmation.warning}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onCloseDeleteModal}>
                {texts.tables.button.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={onDeleteSelected}
                ref={deleteConfirmButtonRef}
                className="!bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
              >
                {texts.tables.button.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {texts.tables.button.add}{" "}
                {selectedTable === "products"
                  ? texts.tables.products.title
                  : texts.tables.services.title}
              </h3>
              <Button
                onClick={onDiscardNew}
                variant="link"
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <FormInput
                  id="name"
                  name="name"
                  type="text"
                  placeholder={`${texts.tables.placeholder.name} ${
                    selectedTable === "products"
                      ? texts.tables.placeholder.product
                      : texts.tables.placeholder.service
                  }`}
                  value={newItem?.name || ""}
                  onChange={(e) =>
                    onNewItemChange({ ...newItem, name: e.target.value })
                  }
                  inputRef={nameInputRef}
                  required
                />
              </div>
              {selectedTable === "services" && (
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {texts.tables.label.status}
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        newItem?.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {newItem?.isActive
                        ? texts.tables.services.active
                        : texts.tables.services.inactive}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onNewItemChange({
                          ...newItem,
                          isActive: !newItem?.isActive,
                        })
                      }
                      className={`${
                        newItem?.isActive
                          ? "bg-green-600 focus:ring-green-500"
                          : "bg-gray-200 focus:ring-gray-500"
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          newItem?.isActive ? "translate-x-5" : "translate-x-0"
                        } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>
              )}
              <div>
                <FormInput
                  id="price"
                  name="price"
                  type="number"
                  step="1"
                  placeholder={texts.tables.placeholder.price}
                  value={newItem?.price || ""}
                  onChange={(e) =>
                    onNewItemChange({ ...newItem, price: e.target.value })
                  }
                  required
                  leftElement={
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      {texts.tables.symbol.price}
                    </span>
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={onDiscardNew}>
                {texts.tables.button.discard}
              </Button>
              <Button
                variant="primary"
                onClick={onSaveNew}
                disabled={!newItem?.name || !newItem?.price}
              >
                {texts.tables.button.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Descarte */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-gray-500/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {texts.tables.message.confirmation.discardTitle}
              </h3>
              <Button
                onClick={onCloseDiscardModal}
                variant="link"
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {texts.tables.message.confirmation.discard}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onCloseDiscardModal}>
                {texts.tables.button.cancel}
              </Button>
              <Button
                variant="primary"
                ref={discardConfirmButtonRef}
                onClick={onDiscard}
                className="!bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
              >
                {texts.tables.button.discard}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
