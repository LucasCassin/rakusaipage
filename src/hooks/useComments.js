import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function useComments({ videoId, user, isLoadingAuth }) {
  const router = useRouter();

  // --- Estados do Hook ---
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Para o carregamento inicial
  const [isSubmitting, setIsSubmitting] = useState(false); // Para criar/editar comentários
  const [likingCommentId, setLikingCommentId] = useState(null); // Para o loading do botão de like
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeForm, setActiveForm] = useState({ id: null, mode: null }); // mode: 'edit' ou 'reply'

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
      setIsSubmitting(true);
      clearMessages();

      try {
        const response = await fetch(settings.global.API.ENDPOINTS.COMMENT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, video_id: videoId, parent_id }),
        });

        const newComment = await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (data) => {
            setSuccess("Comentário adicionado com sucesso!");
            setComments((prev) =>
              [data, ...prev].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at),
              ),
            );
            closeActiveForm();
          },
          onFinally: () => {
            setIsSubmitting(false);
          },
        });
        return !!newComment;
      } catch (e) {
        setError(
          "Não foi possível adicionar o comentário. Verifique sua conexão.",
        );
        setIsSubmitting(false);
        console.error("Falha ao adicionar comentário:", e);
        return false;
      }
    },
    [videoId, router],
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
    [router],
  );

  // Funções de update e delete completas, seguindo o padrão
  const updateComment = useCallback(
    async (commentId, content) => {
      setIsSubmitting(true);
      clearMessages();

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.COMMENT}`,
          {
            // Supondo rota PATCH
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment_id: commentId, content }),
          },
        );

        const updatedComment = await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (data) => {
            setSuccess("Comentário atualizado!");
            setComments((prev) =>
              prev.map((c) => (c.id === commentId ? data : c)),
            );
            closeActiveForm();
          },
          onFinally: () => setIsSubmitting(false),
        });
        return !!updatedComment;
      } catch (e) {
        setError(
          "Não foi possível editar o comentário. Verifique sua conexão.",
        );
        console.log("Falha ao editar comentário:", e);
        setIsSubmitting(false);
        return false;
      }
    },
    [router],
  );

  const deleteComment = useCallback(
    async (commentId) => {
      // A UI pode mostrar um modal de confirmação antes de chamar esta função
      setIsSubmitting(true);
      clearMessages();

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.COMMENT}`,
          {
            // Supondo rota DELETE
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment_id: commentId }),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: () => {
            setSuccess("Comentário excluído!");
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          },
          onFinally: () => setIsSubmitting(false),
        });
      } catch (e) {
        setError(
          "Não foi possível excluir o comentário. Verifique sua conexão.",
        );
        console.log("Falha ao excluir comentário:", e);
        setIsSubmitting(false);
      }
    },
    [router],
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
