import { useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { settings } from "config/settings";
import useUrlManager from "./useUrlManager";
import { useMessage } from "./useMessage";
import { texts } from "src/utils/texts";

// Função auxiliar para gerar dados simulados
const generateFakeData = () => {
  const productNames = settings.tables.PRODUCTS.NAMES;
  const serviceNames = settings.tables.SERVICES.NAMES;

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const shuffledProducts = shuffleArray([...productNames]);
  const shuffledServices = shuffleArray([...serviceNames]);

  const products = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: shuffledProducts[index % shuffledProducts.length],
    price: (Math.random() * 5000 + 100).toFixed(2), // Preços entre 100 e 5100
  }));

  const services = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: shuffledServices[index % shuffledServices.length],
    isActive: Math.random() > 0.3, // 70% de chance de estar ativo
    price: (Math.random() * 1000 + 50).toFixed(2), // Preços entre 50 e 1050
  }));

  return { products, services };
};

export default function useTableManager() {
  const { updateUrl, updateMultipleUrl, getParamValue } = useUrlManager();
  const { setError, error, setSuccess, success, clearError, clearSuccess } =
    useMessage();

  // Obter parâmetros da URL
  const tableQuery = getParamValue("table") || "products";
  const query = getParamValue("query") || "";
  const pageQuery = parseInt(getParamValue("page")) || 1;

  // Estados
  const [data, setData] = useState(generateFakeData());
  const [selectedTable, setSelectedTable] = useState(tableQuery);
  const [searchTerm, setSearchTerm] = useState(query);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    canRead: false,
    canUpdate: false,
  });
  const [showContent, setShowContent] = useState(true);

  // Refs para controle de foco
  const nameInputRef = useRef(null);
  const deleteConfirmButtonRef = useRef(null);
  const discardConfirmButtonRef = useRef(null);
  const isInitialRender = useRef(true);
  const ignoreSearchUpdate = useRef(false);

  // Atualizar selectedTable quando tableQuery muda
  useEffect(() => {
    setSelectedTable(tableQuery);
  }, [tableQuery]);

  // Atualizar searchTerm quando query muda
  useEffect(() => {
    setSearchTerm(query);
  }, [query]);

  // Atualizar URL com termo de busca
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (ignoreSearchUpdate.current) {
      ignoreSearchUpdate.current = false;
      return;
    }
    if (searchTerm === query) return;

    updateMultipleUrl({
      query: searchTerm,
      page: "", // Reseta a página ao buscar
    });
  }, [searchTerm, query]);

  // Definir cancela antes de qualquer função que possa usá-la
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditForm(null);
  }, []);

  // Filtra dados baseado na busca
  const filteredData = useCallback(() => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    const currentData =
      selectedTable === "products" ? data.products : data.services;

    if (!searchLower) return currentData;

    return currentData.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchLower),
      ),
    );
  }, [data, selectedTable, debouncedSearchTerm]);

  // Calcula paginação
  const totalItems = filteredData().length;
  const totalPages = Math.ceil(totalItems / settings.tables.PAGINATION_LIMIT);
  const currentPage = Math.min(Math.max(1, pageQuery), totalPages || 1);

  // Verifica e ajusta a página inicial se necessário
  useEffect(() => {
    if (pageQuery > totalPages && totalPages > 0) {
      updateUrl("page", totalPages === 1 ? undefined : totalPages);
    }
  }, [pageQuery, totalPages]);

  // Pagina os dados
  const paginatedData = useCallback(() => {
    const filtered = filteredData();
    const startIndex = (currentPage - 1) * settings.tables.PAGINATION_LIMIT;
    return filtered.slice(
      startIndex,
      startIndex + settings.tables.PAGINATION_LIMIT,
    );
  }, [filteredData, currentPage]);

  // Handlers
  const handleSearch = useCallback((e) => {
    ignoreSearchUpdate.current = false;
    setSearchTerm(e.target.value);
    setSelectedRows(new Set());
    setIsEditing(false);
    setEditForm(null);
  }, []);

  const handlePageChange = useCallback(
    (page) => {
      const validPage = Math.min(Math.max(1, page), totalPages || 1);
      if (validPage === 1) {
        updateUrl("page", "");
      } else {
        updateUrl("page", validPage);
      }
    },
    [totalPages],
  );

  const handleTableChange = useCallback(
    (table) => {
      if (table === selectedTable) return;

      // Marca para ignorar as próximas atualizações
      ignoreSearchUpdate.current = true;

      // Primeiro atualiza o estado interno
      setSelectedTable(table);
      setSearchTerm("");

      // Depois atualiza a URL com todos os parâmetros necessários
      updateMultipleUrl({
        table: table,
        query: "", // Limpa a query
        page: "", // Reseta a página
      });

      setSelectedRows(new Set());
      setIsEditing(false);
      setEditForm(null);
    },
    [selectedTable],
  );

  const handleSelectAll = useCallback(() => {
    handleCancel();
    const currentData = filteredData();

    if (selectedRows.size === currentData.length) {
      setSelectedRows(new Set());
    } else {
      // Garantir que estamos selecionando apenas os itens visíveis na página atual
      const newSelectedRows = new Set(currentData.map((item) => item.id));
      setSelectedRows(newSelectedRows);
    }
  }, [filteredData, selectedRows, handleCancel]);

  const handleRowClick = useCallback(
    (row) => {
      if (!permissions.canUpdate) return;

      if (isEditing) {
        if (editForm?.id !== row.id) {
          handleCancel();
        } else {
          return;
        }
      }

      const newSelected = new Set(selectedRows);
      if (newSelected.has(row.id)) {
        newSelected.delete(row.id);
      } else {
        newSelected.add(row.id);
      }
      setSelectedRows(newSelected);
    },
    [isEditing, editForm, selectedRows, permissions.canUpdate, handleCancel],
  );

  const handleSave = useCallback(() => {
    if (!editForm) return;

    const newData = { ...data };
    const tableKey = selectedTable === "products" ? "products" : "services";
    const index = newData[tableKey].findIndex(
      (item) => item.id === editForm.id,
    );

    if (index !== -1) {
      newData[tableKey][index] = editForm;
      setData(newData);
    }

    setSuccess(texts.tables.message.success.edit);
    setIsEditing(false);
    setSelectedRows(new Set());
    setEditForm(null);
    setTimeout(() => {
      clearSuccess();
    }, 3000);
  }, [data, editForm, selectedTable, setSuccess, clearSuccess]);

  const handleEdit = useCallback(() => {
    if (selectedRows.size !== 1) return;

    const tableKey = selectedTable === "products" ? "products" : "services";
    const row = [...data[tableKey]].find(
      (item) => item.id === [...selectedRows][0],
    );
    setEditForm({ ...row });
    setIsEditing(true);
  }, [data, selectedRows, selectedTable]);

  const handleAdd = useCallback(() => {
    setSelectedRows(new Set());
    setIsEditing(false);
    setEditForm(null);

    const tableKey = selectedTable === "products" ? "products" : "services";
    const newId = Math.max(...data[tableKey].map((item) => item.id)) + 1;

    const item =
      selectedTable === "products"
        ? { id: newId, name: "", price: "" }
        : { id: newId, name: "", isActive: true, price: "" };

    setNewItem(item);
    setShowAddModal(true);
  }, [data, selectedTable]);

  const handleSaveNew = useCallback(() => {
    if (!newItem) return;

    const newData = { ...data };
    const tableKey = selectedTable === "products" ? "products" : "services";
    newData[tableKey] = [...newData[tableKey], newItem];
    setData(newData);
    setShowAddModal(false);
    setNewItem(null);
    setSuccess(texts.tables.message.success.add);
    setTimeout(() => {
      clearSuccess();
    }, 3000);
  }, [data, newItem, selectedTable, setSuccess, clearSuccess]);

  const handleDiscardNew = useCallback(() => {
    if (
      newItem?.name ||
      (newItem?.price && newItem.price !== "0" && newItem.price !== "0.00")
    ) {
      setShowDiscardModal(true);
    } else {
      setShowAddModal(false);
      setNewItem(null);
    }
  }, [newItem]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setShowAddModal(false);
    setNewItem(null);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    console.log("handleDeleteSelected chamado");
    if (selectedRows.size === 0) return;
    try {
      const newData = { ...data };
      const tableKey = selectedTable === "products" ? "products" : "services";

      // Converter o Set para Array para evitar problemas em algumas implementações de Set
      const selectedIdsArray = Array.from(selectedRows);

      newData[tableKey] = newData[tableKey].filter(
        (item) => !selectedIdsArray.includes(item.id),
      );

      setData(newData);
      setSelectedRows(new Set());
      setShowDeleteModal(false);
      setSuccess(
        texts.tables.message.success.delete.replace(
          "{count}",
          selectedRows.size,
        ),
      );
      setTimeout(() => {
        clearSuccess();
      }, 3000);
    } catch (error) {
      console.error("Erro ao excluir itens:", error);
      setError(texts.tables.message.error.deleteError);
      setTimeout(() => {
        clearError();
      }, 3000);
    }
  }, [data, selectedRows, selectedTable, setSuccess, setError, clearError]);

  const handleFileImport = useCallback(
    async (e) => {
      setSelectedRows(new Set());
      setIsEditing(false);
      setEditForm(null);

      const file = e.target.files[0];
      if (!file) return;

      try {
        setIsLoading(true);
        const fileExtension = file.name.split(".").pop().toLowerCase();
        const newData = { ...data };
        const tableKey = selectedTable === "products" ? "products" : "services";
        const newItems = [];

        if (fileExtension === "csv") {
          const text = await file.text();
          const rows = text
            .split("\n")
            .map((row) => row.split(";").map((cell) => cell.trim()));

          const dataRows = rows.filter(
            (row) => row.length > 0 && row[0] !== "",
          );
          if (dataRows.length <= 1) {
            setError(texts.tables.message.error.csvEmptyFile);
            setIsLoading(false);
            setTimeout(() => {
              clearError();
            }, 3000);
            return;
          }
          dataRows.shift();

          dataRows.forEach((row, index) => {
            if (row.length < 2) return;

            const item = {
              id: Math.max(...newData[tableKey].map((i) => i.id)) + index + 1,
              name: row[0],
              price: row[1].replace(",", ".").toString(),
            };

            if (selectedTable === "services") {
              item.isActive =
                row[2]?.toLowerCase() === "true" ||
                row[2]?.toLowerCase() === "1";
            }

            newItems.push(item);
          });
        } else if (fileExtension === "xlsx") {
          try {
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.default.Workbook();
            const buffer = await file.arrayBuffer();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
              setError(texts.tables.message.error.excelNotFound);
              setIsLoading(false);
              setTimeout(() => {
                clearError();
              }, 3000);
              return;
            }

            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;

              const item = {
                id:
                  Math.max(...newData[tableKey].map((i) => i.id)) +
                  newItems.length +
                  1,
                name: row.getCell(1).value,
                price: row.getCell(2).value.toString(),
              };

              if (selectedTable === "services") {
                item.isActive = row.getCell(3)?.value === true;
              }

              newItems.push(item);
            });
          } catch (error) {
            console.error("Erro ao importar Excel:", error);
            setError(texts.tables.message.error.importError);
            setIsLoading(false);
            setTimeout(() => {
              clearError();
            }, 3000);
            return;
          }
        } else {
          setError(texts.tables.message.error.invalidFile);
          setIsLoading(false);
          setTimeout(() => {
            clearError();
          }, 3000);
          return;
        }

        if (newItems.length === 0) {
          setError(texts.tables.message.error.noValidItems);
          setIsLoading(false);
          setTimeout(() => {
            clearError();
          }, 3000);
          return;
        }

        newData[tableKey] = [...newData[tableKey], ...newItems];
        setData(newData);
        setSuccess(
          texts.tables.message.success.import.replace(
            "{count}",
            newItems.length,
          ),
        );
        setTimeout(() => {
          clearSuccess();
        }, 3000);
        setIsLoading(false);
      } catch (error) {
        console.error("Erro na importação:", error);
        setError(`${texts.tables.message.error.importError} ${error.message}`);
        setIsLoading(false);
        setTimeout(() => {
          clearError();
        }, 3000);
      }
    },
    [data, selectedTable, setError, setSuccess],
  );

  return {
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
    filteredData: filteredData(),
    totalItems,
    totalPages,
    currentPage,
    paginatedData: paginatedData(),

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
    setIsLoading,

    // Mensagens
    error,
    success,
  };
}
