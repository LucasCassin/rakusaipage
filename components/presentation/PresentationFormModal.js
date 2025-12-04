import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";
import { toZonedTime, format, fromZonedTime } from "date-fns-tz";

/**
 * Modal para CRIAR ou EDITAR uma apresentação.
 */
export default function PresentationFormModal({
  error,
  onClose,
  onSubmit,
  presentationToEdit = null,
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    meet_time: "",
    meet_location: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (presentationToEdit) {
      const timeZone = "America/Sao_Paulo";

      const toSpTime = (isoString) => {
        if (!isoString) return "";

        const zonedDate = toZonedTime(isoString, timeZone);

        return format(zonedDate, "yyyy-MM-dd'T'HH:mm", { timeZone });
      };

      setFormData({
        name: presentationToEdit.name || "",
        description: presentationToEdit.description || "",

        date: toSpTime(presentationToEdit.date),

        location: presentationToEdit.location || "",

        meet_time: toSpTime(presentationToEdit.meet_time),

        meet_location: presentationToEdit.meet_location || "",
      });
    }
  }, [presentationToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const finalData = {};
    const timeZone = "America/Sao_Paulo";

    for (const key in formData) {
      const value = formData[key];

      if (value) {
        if (key === "date" || key === "meet_time") {
          try {
            let dateValue = value;
            if (dateValue.length === 16) {
              dateValue = `${dateValue}:00`;
            }

            const utcDate = fromZonedTime(dateValue, timeZone);

            finalData[key] = utcDate.toISOString();
          } catch (err) {
            console.error(`Data inválida em ${key}:`, err);

            finalData[key] = value;
          }
        } else {
          finalData[key] = value;
        }
      }
    }

    await onSubmit(finalData);
    setIsLoading(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Bloqueia ações se já estiver processando a deleção
      if (isLoading) return;

      if (event.key === "Escape") {
        onClose();
      }

      // Enter só funciona se a validação (canDelete) for verdadeira
      if (event.key === "Enter") {
        event.preventDefault(); // Evita submit padrão de formulário se houver
        handleSubmit(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleSubmit, isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">
            {/* 4. Título Condicional */}
            {presentationToEdit ? "Editar Informações" : "Nova Apresentação"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="space-y-1">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                Hora do Evento
              </label>
              <FormInput
                id="date"
                name="date"
                type="datetime-local"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
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
                type="datetime-local"
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

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              size="small"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              size="small"
              className="w-full sm:w-auto"
            >
              {/* 4. Botão Condicional */}
              {presentationToEdit ? "Salvar Alterações" : "Criar e Editar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
