import React from "react";
import { FiSearch } from "react-icons/fi";
import Button from "components/ui/Button";

const UserSearchForm = ({ onSearch, isLoading, username, setUsername }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !username.trim()) return;
    onSearch(username);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full"
    >
      {/* Wrapper do Input */}
      <div className="relative w-full sm:flex-grow">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Buscar por nome de usuário..."
          disabled={isLoading}
          className="w-full pl-12 py-2 px-6 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-rakusai-purple focus:border-transparent"
        />
      </div>

      {/* Botão */}
      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        size="small"
        className="w-full sm:w-auto"
      >
        {isLoading ? "Buscando..." : "Buscar"}
      </Button>
    </form>
  );
};

export default UserSearchForm;
