import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function useComments({ videoId, user, isLoadingAuth }) {
  const router = useRouter();

  // --- Estados do Hook ---
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Para o carregamento inicial
  const [isSubmitting, setIsSubmitting] = useState(null); // Para criar/editar comentários
  const [likingCommentId, setLikingCommentId] = useState(null); // Para o loading do botão de like
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeForm, setActiveForm] = useState({ id: null, mode: null }); // mode: 'edit' ou 'reply'
  const [deletingCommentId, setDeletingCommentId] = useState(null); // MUDANÇA: Novo estado

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // --- Funções de API ---

  const fetchComments = useCallback(async () => {
    if (isLoadingAuth || !user) {
      setIsLoading(false); // Garante que o loading de comentários não fique preso
      return;
    }

    if (!videoId) return;
    setIsLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.COMMENT}?video_id=${videoId}`,
      );

      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setComments(data || []);
        },
        onFinally: () => {
          setIsLoading(false);
        },
      });
    } catch (e) {
      setError(
        "Não foi possível carregar os comentários. Verifique sua conexão.",
      );
      setIsLoading(false);
      console.error("Falha na busca de comentários:", e);
    }
  }, [videoId, router, user, isLoadingAuth]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const openReplyForm = (commentId) =>
    setActiveForm({ id: commentId, mode: "reply" });
  const openEditForm = (commentId) =>
    setActiveForm({ id: commentId, mode: "edit" });
  const closeActiveForm = () => setActiveForm({ id: null, mode: null });

  const addComment = useCallback(
    async (content, parent_id = null) => {
      const submittingId = parent_id ? activeForm.id : "main";
      setIsSubmitting(submittingId);
      clearMessages();
      let opSuccess = false;
      try {
        const response = await fetch(settings.global.API.ENDPOINTS.COMMENT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // CORREÇÃO: Enviando 'return_list: true' para o backend
          body: JSON.stringify({
            content,
            video_id: videoId,
            parent_id,
            return_list: true,
          }),
        });
        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (updatedList) => {
            setSuccess("Comentário adicionado com sucesso!");
            // CORREÇÃO: A resposta JÁ É a lista completa e ordenada. Apenas a usamos.
            setComments(updatedList);
            closeActiveForm();
            opSuccess = true;
          },
          onFinally: () => setIsSubmitting(null),
        });
      } catch (e) {
        setIsSubmitting(null);
        console.error("Falha ao adicionar comentário:", e);
      }
      return opSuccess;
    },
    [videoId, router, activeForm.id, setComments, setSuccess, closeActiveForm],
  );

  const toggleLike = useCallback(
    async (commentId, hasLiked) => {
      setLikingCommentId(commentId);
      clearMessages();

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.COMMENT_LIKE}/${commentId}`,
          {
            method: hasLiked ? "DELETE" : "PUT",
          },
        );

        await handleApiResponse({
          response,
          router,
          setError, // Para mostrar erros de like, se houver
          onSuccess: (data) => {
            setComments((prev) =>
              prev.map((c) =>
                c.id === commentId
                  ? {
                      ...c,
                      likes_count: data.likes_count,
                      liked_by_user: !hasLiked,
                    }
                  : c,
              ),
            );
          },
          onFinally: () => {
            setLikingCommentId(null);
          },
        });
      } catch (e) {
        setError(
          "Não foi possível processar a curtida. Verifique sua conexão.",
        );
        setLikingCommentId(null);
        console.error("Falha ao curtir/descurtir:", e);
      }
    },
    [router, setComments, setError],
  );

  // Funções de update e delete completas, seguindo o padrão
  const updateComment = useCallback(
    async (commentId, content) => {
      setIsSubmitting(commentId);
      clearMessages();
      let opSuccess = false;
      try {
        const response = await fetch(settings.global.API.ENDPOINTS.COMMENT, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // CORREÇÃO: Enviando 'return_list: true' para o backend
          body: JSON.stringify({
            comment_id: commentId,
            content,
            return_list: true,
          }),
        });
        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (updatedList) => {
            setSuccess("Comentário atualizado!");
            // CORREÇÃO: A resposta JÁ É a lista completa e ordenada.
            setComments(updatedList);
            closeActiveForm();
            opSuccess = true;
          },
          onFinally: () => setIsSubmitting(null),
        });
      } catch (e) {
        setIsSubmitting(null);
        console.error("Falha ao atualizar comentário:", e);
      }
      return opSuccess;
    },
    [router, setComments, setSuccess, closeActiveForm],
  );

  const deleteComment = useCallback(
    async (commentId) => {
      clearMessages();
      setDeletingCommentId(commentId);
      try {
        const response = await fetch(settings.global.API.ENDPOINTS.COMMENT, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment_id: commentId,
            return_list: true, // Adiciona a flag para receber a lista de volta
          }),
        });
        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (updatedList) => {
            setSuccess("Comentário excluído!");
            setComments(updatedList);
          },
          onFinally: () => {
            setDeletingCommentId(null);
          },
        });
      } catch (e) {
        setError(
          "Não foi possível excluir o comentário. Verifique sua conexão.",
        );
        console.log("Falha ao excluir comentário:", e);
        setDeletingCommentId(null);
      }
    },
    [router, setComments, setSuccess],
  );

  return {
    // Estados de dados e UI
    comments,
    isLoading,
    isSubmitting,
    likingCommentId,
    error,
    success,
    activeForm,
    deletingCommentId,
    // Ações
    fetchComments,
    addComment,
    toggleLike,
    updateComment,
    deleteComment,
    openReplyForm,
    openEditForm,
    closeActiveForm,
  };
}
