import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Button from "components/ui/Button";
import { texts } from "src/utils/texts";

export default function TableControls({
  searchTerm,
  selectedTable,
  permissions,
  onSearch,
  onTableChange,
  onAdd,
  onFileImport,
  data,
  searchInputRef,
  // filterInputRef,
  // sortSelectRef,
  addButtonRef,
  exportButtonRef,
  // refreshButtonRef,
  // bulkActionsButtonRef,
  // columnVisibilityButtonRef,
  // rowSelectionButtonRef,
  // paginationButtonRef,
  // viewOptionsButtonRef,
  // helpButtonRef,
  // settingsButtonRef,
}) {
  const fileInputRef = React.useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Tabs */}
      <nav className="flex gap-2" aria-label="Tabs">
        <button
          onClick={() => onTableChange("products")}
          className={`${
            selectedTable === "products"
              ? "bg-white [box-shadow:-2px_-2px_4px_rgba(0,0,0,0.05),2px_-2px_4px_rgba(0,0,0,0.05)]"
              : "bg-gray-200 hover:bg-gray-300"
          } min-w-[160px] px-4 py-2.5 rounded-t-lg flex items-center gap-2`}
        >
          <svg
            className={`h-5 w-5 ${
              selectedTable === "products" ? "text-indigo-600" : "text-gray-400"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <span
            className={`${
              selectedTable === "products" ? "text-indigo-600" : "text-gray-500"
            } font-medium`}
          >
            {texts.tables.products.title}
          </span>
          <span
            className={`${
              selectedTable === "products"
                ? "bg-indigo-50 text-indigo-600"
                : "bg-gray-300 text-gray-500"
            } ml-auto text-xs px-2 py-0.5 rounded-full`}
          >
            {data.products.length}
          </span>
        </button>
        <button
          onClick={() => onTableChange("services")}
          className={`${
            selectedTable === "services"
              ? "bg-white [box-shadow:-2px_-2px_4px_rgba(0,0,0,0.05),2px_-2px_4px_rgba(0,0,0,0.05)]"
              : "bg-gray-200 hover:bg-gray-300"
          } min-w-[160px] px-4 py-2.5 rounded-t-lg flex items-center gap-2`}
        >
          <svg
            className={`h-5 w-5 ${
              selectedTable === "services" ? "text-indigo-600" : "text-gray-400"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span
            className={`${
              selectedTable === "services" ? "text-indigo-600" : "text-gray-500"
            } font-medium`}
          >
            {texts.tables.services.title}
          </span>
          <span
            className={`${
              selectedTable === "services"
                ? "bg-indigo-50 text-indigo-600"
                : "bg-gray-300 text-gray-500"
            } ml-auto text-xs px-2 py-0.5 rounded-full`}
          >
            {data.services.length}
          </span>
        </button>
      </nav>

      {/* Controles */}
      <div className="px-4 py-4 border-b border-gray-200 rounded-tr-lg bg-white [box-shadow:-2px_-2px_4px_rgba(0,0,0,0.05),2px_-2px_4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearch(e)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                placeholder={texts.tables.placeholder.search}
                ref={searchInputRef}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {permissions.canUpdate && (
              <>
                <Button
                  onClick={onAdd}
                  className="rounded-md"
                  ref={addButtonRef}
                >
                  <span className="flex items-center">
                    <svg
                      className="h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>{texts.tables.button.add}</span>
                  </span>
                </Button>
                <label className="inline-block">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={onFileImport}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleImportClick}
                    className="rounded-md"
                    ref={exportButtonRef}
                  >
                    <span className="flex items-center">
                      <svg
                        className="h-4 w-4 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <span>{texts.tables.button.import}</span>
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
