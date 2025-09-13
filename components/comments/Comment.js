import React from "react";
import UserAvatar from "components/ui/UserAvatar";
import CommentForm from "components/forms/CommentForm";
import { FiMessageSquare, FiEdit2, FiTrash2 } from "react-icons/fi"; // Ícones de Ação
import LikeButton from "components/ui/LikeButton";
import Spinner from "components/ui/Spinner";

const Comment = ({
  comment,
  currentUser,
  onLike,
  onUpdate,
  onDelete,
  onReply,
  // isReply = false,
  activeForm,
  onSetReply,
  onSetEdit,
  onCancel,
  isSubmitting,
  likingCommentId,
  deletingCommentId,
}) => {
  const isEditing = activeForm.id === comment.id && activeForm.mode === "edit";
  const isReplying =
    activeForm.id === comment.id && activeForm.mode === "reply";

  const isThisFormSubmitting = isSubmitting === comment.id;
  const isThisCommentBeingLiked = likingCommentId === comment.id;

  const isAffectedByDeletion =
    deletingCommentId === comment.id ||
    (deletingCommentId !== null && deletingCommentId === comment.parent_id);

  const isDisabled =
    isThisFormSubmitting || isThisCommentBeingLiked || isAffectedByDeletion;

  const isOwner = currentUser?.id === comment.user_id;
  const canEdit =
    (isOwner && currentUser?.features.includes("update:self:comment")) ||
    (!isOwner && currentUser?.features.includes("update:other:comment"));
  const canDelete =
    (isOwner && currentUser?.features.includes("delete:self:comment")) ||
    (!isOwner && currentUser?.features.includes("delete:other:comment"));
  const canLike = currentUser?.features.includes("like:comment");
  const canUnlike = currentUser?.features.includes("unlike:comment");
  const canReply = currentUser?.features.includes("create:comment"); // Só pode responder se não for uma resposta

  const handleUpdate = async (content) => {
    return await onUpdate(comment.id, content);
  };

  const handleReply = async (content) => {
    const parentIdForNewReply = comment.parent_id || comment.id;
    return await onReply(content, parentIdForNewReply);
  };

  return (
    <div
      className={`flex gap-3 my-4 transition-opacity duration-300 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <UserAvatar username={comment.username} />
      <div className="flex-1">
        <div className="bg-gray-100 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{comment.username}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          {isEditing ? (
            <CommentForm
              initialContent={comment.content}
              onSubmit={handleUpdate}
              onCancel={onCancel}
              isSubmitting={isThisFormSubmitting} // Passa o estado de submissão específico deste formulário
            />
          ) : (
            <p className="text-gray-800 text-sm mt-1">{comment.content}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 px-2">
          {canLike && (
            <LikeButton
              isLiked={comment.liked_by_user}
              likeCount={comment.likes_count}
              onClick={() => onLike(comment.id, comment.liked_by_user)}
              isLoading={isThisCommentBeingLiked}
              disabled={(comment.liked_by_user && !canUnlike) || isDisabled}
            />
          )}
          {canReply && (
            <button
              onClick={onSetReply}
              disabled={isDisabled}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              <FiMessageSquare />
            </button>
          )}
          {canEdit && (
            <button
              onClick={onSetEdit}
              disabled={isDisabled}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              <FiEdit2 />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isDisabled}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              {isAffectedByDeletion ? (
                <Spinner size="4" color="text-red-500" />
              ) : (
                <FiTrash2 className="text-red-600" />
              )}
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-2">
            <CommentForm
              onSubmit={handleReply}
              placeholder={`Respondendo a ${comment.username}...`}
              onCancel={onCancel}
              isSubmitting={isThisFormSubmitting} // Passa o estado de submissão específico deste formulário
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Comment;
