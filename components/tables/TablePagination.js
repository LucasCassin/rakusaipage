import React from "react";
import { texts } from "src/utils/texts";
import { settings } from "config/settings";

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * settings.tables.PAGINATION_LIMIT + 1;
  const endItem = Math.min(
    currentPage * settings.tables.PAGINATION_LIMIT,
    totalItems,
  );

  return (
    <div className="px-4 py-3 bg-white rounded-b-lg [box-shadow:-2px_2px_4px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-700"
          >
            {texts.tables.pagination.previous}
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-700"
          >
            {texts.tables.pagination.next}
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {totalItems > 0 ? (
                <>
                  {texts.tables.pagination.showing}{" "}
                  <span className="font-medium">{startItem}</span>{" "}
                  {texts.tables.pagination.to}{" "}
                  <span className="font-medium">{endItem}</span>{" "}
                  {texts.tables.pagination.of}{" "}
                  <span className="font-medium">{totalItems}</span>{" "}
                  {texts.tables.pagination.entries}
                </>
              ) : (
                texts.tables.message.noResults
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-md ${
                      page === currentPage
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
