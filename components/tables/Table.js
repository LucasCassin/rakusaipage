import React from "react";
import { texts } from "src/utils/texts";

// Função para formatar moeda no padrão brasileiro
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function Table({
  data,
  selectedRows,
  isEditing,
  editForm,
  selectedTable,
  onRowClick,
  onSelectAll,
  onEditFormChange,
  permissions,
}) {
  // Verifica se todos os itens estão selecionados
  const isAllSelected =
    data &&
    data.length > 0 &&
    selectedRows &&
    selectedRows.size === data.length;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-b-lg [box-shadow:-2px_2px_4px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)]">
        <div className="w-48 h-48 mb-6">
          <svg
            className="w-full h-full text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {texts.tables.message.noResults}
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          {texts.tables.message.emptyTable}
        </p>
      </div>
    );
  }

  const renderCell = (row, field) => {
    if (isEditing && selectedRows.has(row.id)) {
      if (field === "isActive") {
        return (
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) =>
                onEditFormChange({ ...editForm, isActive: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-500">
              {editForm.isActive
                ? texts.tables.services.active
                : texts.tables.services.inactive}
            </span>
          </div>
        );
      } else if (field === "price") {
        return (
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-gray-500 mr-2">R$</span>
            <input
              type="number"
              step="1"
              value={editForm.price}
              onChange={(e) =>
                onEditFormChange({ ...editForm, price: e.target.value })
              }
              className="block w-full px-3 py-1.5 border border-gray-200 rounded-md shadow-sm sm:text-sm"
            />
          </div>
        );
      } else if (field === "name") {
        return (
          <input
            type="text"
            value={editForm.name}
            onChange={(e) =>
              onEditFormChange({ ...editForm, name: e.target.value })
            }
            className="block w-full px-3 py-1.5 border border-gray-200 rounded-md shadow-sm sm:text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        );
      }
    }

    if (field === "price") {
      return formatCurrency(parseFloat(row.price));
    }

    if (field === "isActive") {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.isActive
            ? texts.tables.services.active
            : texts.tables.services.inactive}
        </span>
      );
    }

    return row[field];
  };

  return (
    <div className="overflow-x-auto px-1 bg-white [box-shadow:-2px_0px_4px_rgba(0,0,0,0.05),2px_0px_4px_rgba(0,0,0,0.05)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {permissions.canUpdate && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l-4 border-l-transparent">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label={texts.tables.button.selectAll}
                />
              </th>
            )}
            {selectedTable === "products" ? (
              <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.products.headers.code}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.products.headers.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.products.headers.price}
                </th>
              </>
            ) : (
              <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.services.headers.code}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.services.headers.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.services.headers.isActive}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {texts.tables.services.headers.price}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row)}
              className={`${
                selectedRows.has(row.id)
                  ? "bg-gray-50 border-l-4 border-l-blue-500"
                  : "hover:bg-gray-50 border-b border-gray-200"
              } ${permissions.canUpdate ? "cursor-pointer" : ""}`}
            >
              {permissions.canUpdate && (
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(row);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {row.id}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {renderCell(row, "name")}
              </td>
              {selectedTable === "services" && (
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {renderCell(row, "isActive")}
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {renderCell(row, "price")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
