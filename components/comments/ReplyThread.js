import React from "react";
import Comment from "./Comment";
import Button from "components/ui/Button";

const ReplyThread = ({
  parentComment,
  currentUser,
  // Handlers
  onLike,
  onUpdate,
  onDelete,
  onReply,
  // Estados
  activeForm,
  onSetReply,
  onSetEdit,
  onCancel,
  isSubmitting,
  likingCommentId,
  deletingCommentId,
  // Estados da Thread
  openThread,
  toggleReplies,
  showMoreReplies,
}) => {
  const isParentBeingDeleted = deletingCommentId === parentComment.id;

  // Se a thread está aberta para este comentário pai
  if (openThread.parentId === parentComment.id) {
    return (
      <>
        {/* Renderiza as respostas visíveis */}
        {parentComment.children
          .slice(0, openThread.visibleCount)
          .map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              isReply={true}
              onLike={onLike}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReply={onReply}
              activeForm={activeForm}
              onSetReply={() =>
                onSetReply(parentComment.id, openThread.visibleCount)
              }
              onSetEdit={() => onSetEdit(reply.id)}
              onCancel={onCancel}
              isSubmitting={isSubmitting}
              likingCommentId={likingCommentId}
              deletingCommentId={deletingCommentId}
            />
          ))}

        {/* Lógica para o botão "Ver mais" */}
        {parentComment.children.length > openThread.visibleCount && (
          <Button
            variant="link"
            onClick={showMoreReplies}
            className="text-sm mt-2 font-thin pl-2 pt-0 pb-flex gap-3 my-4"
            disabled={isParentBeingDeleted}
          >
            Ver mais {parentComment.children.length - openThread.visibleCount}{" "}
            respostas
          </Button>
        )}
      </>
    );
  }

  // Se a thread estiver fechada, mostra apenas o botão para expandir
  return (
    <Button
      variant="link"
      onClick={() => toggleReplies(parentComment.id)}
      className="text-sm font-thin pl-4 pt-0 pb-0"
      disabled={isParentBeingDeleted}
    >
      Ver {parentComment.children.length}{" "}
      {parentComment.children.length > 1 ? "respostas" : "resposta"}
    </Button>
  );
};

export default ReplyThread;
