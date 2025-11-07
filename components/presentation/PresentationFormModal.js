import React, { useState } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";

/**
 * Modal para CRIAR uma nova apresentação.
 * VERSÃO ATUALIZADA: Inclui todos os campos de logística.
 */
export default function PresentationFormModal({ error, onClose, onSubmit }) {
  // --- MUDANÇA: Adicionar todos os novos campos ao estado ---
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    meet_time: "",
    meet_location: "",
  });
  // --- FIM DA MUDANÇA ---

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Filtra chaves vazias (para 'meet_time' não ir como "" e bugar o 'timestamptz')
    const finalData = {};
    for (const key in formData) {
      if (formData[key]) {
        finalData[key] = formData[key];
      }
    }
    await onSubmit(finalData); //
    setIsLoading(false);
  };

  const title = "Criar Nova Apresentação";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome da Apresentação
            </label>
            <FormInput
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Tanabata"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição (Opcional)
            </label>
            <FormInput
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Apresentação anual no tanabata de Santo André"
              className="mt-1"
            />
          </div>

          {/* --- MUDANÇA: Novos campos de logística --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                Data do Evento
              </label>
              <FormInput
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                Local do Evento
              </label>
              <FormInput
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ex: Bunka Santo André"
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="meet_time"
                className="block text-sm font-medium text-gray-700"
              >
                Horário de Encontro
              </label>
              <FormInput
                id="meet_time"
                name="meet_time"
                type="datetime-local" // Pega Data e Hora
                value={formData.meet_time}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="meet_location"
                className="block text-sm font-medium text-gray-700"
              >
                Local de Encontro
              </label>
              <FormInput
                id="meet_location"
                name="meet_location"
                value={formData.meet_location}
                onChange={handleChange}
                placeholder="Ex: Sala de Treino"
                className="mt-1"
              />
            </div>
          </div>
          {/* --- FIM DA MUDANÇA --- */}

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              size="small"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              size="small"
            >
              Criar e Editar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
