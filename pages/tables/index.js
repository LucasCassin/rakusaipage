import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import Alert from "components/ui/Alert";
import LoadingSpinner from "components/ui/LoadingSpinner";
import InitialLoading from "components/InitialLoading";
import useTableManager from "src/hooks/useTableManager";
import { useMessage } from "src/hooks/useMessage";
import Table from "components/tables/Table";
import TableControls from "components/tables/TableControls";
import TableModals from "components/tables/TableModals";
import TablePagination from "components/tables/TablePagination";

export default function Tables() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { error, success, setError } = useMessage();
  const {
    // Estado
    data,
    selectedTable,
    searchTerm,
    selectedRows,
    isEditing,
    editForm,
    newItem,
    showDeleteModal,
    showAddModal,
    showDiscardModal,
    isLoading,
    permissions,
    setPermissions,
    showContent,
    setShowContent,

    // Dados para UI
    totalItems,
    totalPages,
    currentPage,
    paginatedData,

    // Refs
    nameInputRef,
    deleteConfirmButtonRef,
    discardConfirmButtonRef,

    // Handlers
    handleSearch,
    handlePageChange,
    handleTableChange,
    handleRowClick,
    handleSelectAll,
    handleSave,
    handleCancel,
    handleEdit,
    handleAdd,
    handleSaveNew,
    handleDiscardNew,
    confirmDiscard,
    handleDeleteSelected,
    handleFileImport,

    // Setters
    setShowDeleteModal,
    setShowAddModal,
    setShowDiscardModal,
    setEditForm,
    setNewItem,
    setSelectedRows,

    // Mensagens
    error: errorMessage,
    success: successMessage,
  } = useTableManager();

  // Verifica autenticação e permissões
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.tables.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.LOGIN, {
          scroll: false,
        });
      }, 3000);
      return;
    }

    const userPermissions = {
      canRead: user.features?.includes(settings.tables.FEATURE_READ_TABLE),
      canUpdate:
        user.features?.includes(settings.tables.FEATURE_UPDATE_TABLE) &&
        user.features?.includes(settings.tables.FEATURE_READ_TABLE),
    };

    setPermissions(userPermissions);

    if (!userPermissions.canRead && !userPermissions.canUpdate) {
      setError(texts.tables.message.error.noPermission);
      setShowContent(false);
      router.push(settings.tables.FORBIDDEN_REDIRECT, { scroll: false });
      return;
    }
  }, [user, router, isLoadingAuth, setError, setPermissions, setShowContent]);

  // Gerenciamento de teclas globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Modo de edição - Enter para salvar, Esc para cancelar
      if (isEditing && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (isEditing && e.key === "Escape") {
        handleCancel();
      }

      // Modal de adição - Enter para confirmar, Esc para descartar
      if (showAddModal && e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (newItem?.name) {
          handleSaveNew();
        }
      } else if (showAddModal && e.key === "Escape") {
        handleDiscardNew();
      }

      // Modal de confirmação de descarte - Enter para confirmar, Esc para cancelar
      if (showDiscardModal && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        confirmDiscard();
      } else if (showDiscardModal && e.key === "Escape") {
        setShowDiscardModal(false);
      }

      // Modal de exclusão - Enter para confirmar, Esc para cancelar
      if (showDeleteModal && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        handleDeleteSelected();
      } else if (showDeleteModal && e.key === "Escape") {
        setShowDeleteModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isEditing,
    showAddModal,
    showDiscardModal,
    showDeleteModal,
    newItem,
    handleSave,
    handleCancel,
    handleSaveNew,
    handleDiscardNew,
    confirmDiscard,
    handleDeleteSelected,
    setShowDiscardModal,
    setShowDeleteModal,
  ]);

  // Foco no input de nome quando o modal de adição é aberto
  useEffect(() => {
    if (showAddModal && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current.focus();
      }, 100);
    }
  }, [showAddModal, nameInputRef]);

  // Wrapper para o handleFileImport para garantir que funcione corretamente
  const onFileImport = (e) => {
    if (typeof handleFileImport === "function") {
      handleFileImport(e);
    }
    // Limpa o valor do input file para permitir selecionar o mesmo arquivo novamente
    if (e.target) {
      e.target.value = "";
    }
  };

  if (isLoadingAuth) {
    return <InitialLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {texts.tables.title}
          </h2>
        </div>

        {(error || errorMessage) && (
          <Alert type="error">{error || errorMessage}</Alert>
        )}
        {(success || successMessage) && (
          <Alert type="success">{success || successMessage}</Alert>
        )}

        {(permissions.canRead || permissions.canUpdate) && showContent && (
          <div className="brounded-lg overflow-hidden py-1 px-1">
            <TableControls
              searchTerm={searchTerm}
              selectedTable={selectedTable}
              permissions={permissions}
              onSearch={handleSearch}
              onTableChange={handleTableChange}
              onAdd={handleAdd}
              onFileImport={onFileImport}
              data={data}
            />

            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner message={texts.tables.message.loading} />
              </div>
            ) : (
              <>
                <Table
                  data={paginatedData}
                  selectedRows={selectedRows}
                  isEditing={isEditing}
                  editForm={editForm}
                  selectedTable={selectedTable}
                  onRowClick={handleRowClick}
                  onSelectAll={handleSelectAll}
                  onEditFormChange={setEditForm}
                  permissions={permissions}
                />

                {totalItems > 0 && (
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        )}

        <TableModals
          showDeleteModal={showDeleteModal}
          showAddModal={showAddModal}
          showDiscardModal={showDiscardModal}
          selectedRows={selectedRows}
          isEditing={isEditing}
          newItem={newItem}
          selectedTable={selectedTable}
          onCloseDeleteModal={() => setShowDeleteModal(false)}
          onCloseAddModal={() => setShowAddModal(false)}
          onCloseDiscardModal={() => setShowDiscardModal(false)}
          onDeleteSelected={handleDeleteSelected}
          onSaveNew={handleSaveNew}
          onDiscardNew={handleDiscardNew}
          onNewItemChange={setNewItem}
          onSave={handleSave}
          onCancel={handleCancel}
          onEdit={handleEdit}
          onDelete={() => setShowDeleteModal(true)}
          onDiscard={confirmDiscard}
          nameInputRef={nameInputRef}
          deleteConfirmButtonRef={deleteConfirmButtonRef}
          discardConfirmButtonRef={discardConfirmButtonRef}
          setSelectedRows={setSelectedRows}
        />
      </div>
    </div>
  );
}
