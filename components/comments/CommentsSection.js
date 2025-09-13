import React, { useMemo } from "react";
import { useComments } from "src/hooks/useComments";
import Comment from "./Comment";
import CommentForm from "../forms/CommentForm";
import { useAuth } from "src/contexts/AuthContext";
import LoadingSpinner from "components/ui/LoadingSpinner";
import Button from "components/ui/Button";

const CommentsSection = ({ videoId }) => {
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const {
    comments,
    isLoading: isLoadingComments,
    isSubmitting,
    error,
    addComment,
    toggleLike,
    updateComment,
    deleteComment,
    activeForm,
    openReplyForm,
    openEditForm,
    closeActiveForm,
    likingCommentId,
    deletingCommentId,
    openThread,
    toggleReplies,
    showMoreReplies,
  } = useComments({ videoId, user: currentUser, isLoadingAuth });

  const canCreate = currentUser?.features.includes("create:comment");
  const canRead = currentUser?.features.includes("read:comment");

  // Lógica para aninhar os comentários (respostas)
  const nestedComments = useMemo(() => {
    const commentMap = {};
    comments.forEach(
      (comment) => (commentMap[comment.id] = { ...comment, children: [] }),
    );

    const result = [];
    comments.forEach((comment) => {
      if (comment.parent_id) {
        commentMap[comment.parent_id]?.children.push(commentMap[comment.id]);
      } else {
        result.push(commentMap[comment.id]);
      }
    });
    return result;
  }, [comments]);

  const renderComments = (commentList, isReplyLevel = false) => {
    return commentList.map((comment) => (
      <div key={comment.id}>
        <Comment
          comment={comment}
          currentUser={currentUser}
          isReply={isReplyLevel}
          onLike={toggleLike}
          onUpdate={updateComment}
          onDelete={deleteComment}
          onReply={addComment}
          activeForm={activeForm}
          onSetReply={() => openReplyForm(comment.id)}
          onSetEdit={() => openEditForm(comment.id)}
          onCancel={closeActiveForm}
          isSubmitting={isSubmitting}
          likingCommentId={likingCommentId}
          deletingCommentId={deletingCommentId}
        />
        {comment.children && comment.children.length > 0 && !isReplyLevel && (
          <div className="ml-[1.25rem] pl-[2rem] border-l-2">
            {openThread.parentId === comment.id ? (
              <>
                {/* Renderiza as respostas visíveis */}
                {renderComments(
                  comment.children.slice(0, openThread.visibleCount),
                  true,
                )}

                {/* Lógica para o botão "Ver mais" */}
                {comment.children.length > openThread.visibleCount && (
                  <Button
                    variant="link"
                    onClick={showMoreReplies}
                    className="text-sm mt-2 font-thin pl-2"
                  >
                    Ver mais {comment.children.length - openThread.visibleCount}{" "}
                    respostas
                  </Button>
                )}
              </>
            ) : (
              // Botão para expandir as respostas
              <Button
                variant="link"
                onClick={() => toggleReplies(comment.id)}
                className="text-sm font-thin pl-4"
              >
                Ver {comment.children.length}{" "}
                {comment.children.length > 1 ? "respostas" : "resposta"}
              </Button>
            )}
          </div>
        )}
      </div>
    ));
  };

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (!canRead && !canCreate) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* MUDANÇA: O título e a lista agora são renderizados apenas se o usuário puder ler */}
      {canRead && (
        <>
          <h2 className="text-xl font-bold mb-4">
            Comentários ({comments?.length || 0})
          </h2>

          {isLoadingComments && <LoadingSpinner />}
          {error && <p className="text-red-500">{error}</p>}

          {!isLoadingComments && !error && (
            <div>
              {nestedComments.length > 0 ? (
                renderComments(nestedComments)
              ) : (
                <p>Seja o primeiro a comentar!</p>
              )}
            </div>
          )}
        </>
      )}

      {/* O formulário é renderizado se o usuário puder criar (pode ser visto mesmo que ele não possa ler os outros) */}
      {currentUser && canCreate && (
        <div className="mt-6">
          <CommentForm
            onSubmit={addComment}
            // MUDANÇA: Passa 'true' apenas se o 'isSubmitting' for do formulário principal
            isSubmitting={isSubmitting === "main"}
          />
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
