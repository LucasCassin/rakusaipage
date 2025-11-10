import React, { useState, useEffect, useMemo } from "react";
import Button from "components/ui/Button"; //
import { FiTrash2 } from "react-icons/fi";

/**
 * Calcula em quantos elementos/passos um usuário está.
 *
 */
function calculateParticipation(userId, scenes) {
  if (!scenes) return 0;
  let count = 0;
  for (const scene of scenes) {
    // --- MUDANÇA AQUI ---
    // Pula esta cena se for uma Transição
    if (scene.scene_type === "TRANSITION") {
      continue;
    }
    // --- FIM DA MUDANÇA ---

    // (O 'transition_steps' nunca será contado,
    // mas o 'scene_elements' será)
    if (scene.scene_elements) {
      count += scene.scene_elements.filter(
        (el) => el.assigned_user_id === userId,
      ).length;
    }
    // (Esta parte agora é redundante, mas não faz mal)
    if (scene.transition_steps) {
      count += scene.transition_steps.filter(
        (step) => step.assigned_user_id === userId,
      ).length;
    }
  }
  return count;
}
/**
 * Renderiza um único usuário na lista do elenco, com botão de remover.
 */
const CastUserItem = ({ user, scenes, onRemove }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Botão "Certeza?"
  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingAction]);

  const handleRemove = async () => {
    if (pendingAction !== "delete") {
      setPendingAction("delete");
      return;
    }
    setIsProcessing(true);
    await onRemove(user.id);
    // O 'usePresentationCast' vai atualizar a lista
  };

  // Calcula o contador
  const participationCount = useMemo(
    () => calculateParticipation(user.id, scenes),
    [user.id, scenes],
  );

  const isAssigned = participationCount > 0;
  const isDisabled = isProcessing || isAssigned;
  const buttonTitle = isAssigned
    ? `Este usuário não pode ser removido pois está associado a ${participationCount} item(ns) no mapa.`
    : "Remover do elenco";

  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
      <div>
        <span className="font-semibold text-gray-800">{user.username}</span>
        {participationCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-rakusai-purple rounded-full">
            {participationCount}
          </span>
        )}
      </div>
      <Button
        variant={pendingAction === "delete" ? "warning" : "danger"}
        size="small"
        onClick={handleRemove}
        isLoading={isProcessing}
        disabled={isDisabled}
        title={buttonTitle}
      >
        {pendingAction === "delete" ? "Certeza?" : <FiTrash2 />}
      </Button>
    </div>
  );
};

/**
 * Renderiza a lista completa do elenco atual.
 */
export default function CastUserList({ viewers, scenes, onRemove }) {
  if (!viewers || viewers.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        Nenhum usuário no elenco.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1">
      {viewers.map((viewer) => (
        <CastUserItem
          key={viewer.id}
          user={viewer}
          scenes={scenes}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
