import { useMemo } from "react";

export function useCommentState({
  comment,
  currentUser,
  activeForm,
  isSubmitting,
  likingCommentId,
  deletingCommentId,
}) {
  const isEditing = useMemo(
    () => activeForm.id === comment.id && activeForm.mode === "edit",
    [activeForm, comment.id],
  );
  const isReplying = useMemo(
    () => activeForm.id === comment.id && activeForm.mode === "reply",
    [activeForm, comment.id],
  );

  const isThisFormSubmitting = useMemo(
    () => isSubmitting === comment.id,
    [isSubmitting, comment.id],
  );
  const isThisCommentBeingLiked = useMemo(
    () => likingCommentId === comment.id,
    [likingCommentId, comment.id],
  );

  const isAffectedByDeletion = useMemo(
    () =>
      deletingCommentId === comment.id ||
      (deletingCommentId !== null && deletingCommentId === comment.parent_id),
    [deletingCommentId, comment.id, comment.parent_id],
  );

  const isDisabled = useMemo(
    () =>
      isThisFormSubmitting || isThisCommentBeingLiked || isAffectedByDeletion,
    [isThisFormSubmitting, isThisCommentBeingLiked, isAffectedByDeletion],
  );

  const isOwner = useMemo(
    () => currentUser?.id === comment.user_id,
    [currentUser, comment.user_id],
  );

  const canEdit = useMemo(
    () =>
      (isOwner && currentUser?.features.includes("update:self:comment")) ||
      (!isOwner && currentUser?.features.includes("update:other:comment")),
    [isOwner, currentUser?.features],
  );

  const canDelete = useMemo(
    () =>
      (isOwner && currentUser?.features.includes("delete:self:comment")) ||
      (!isOwner && currentUser?.features.includes("delete:other:comment")),
    [isOwner, currentUser?.features],
  );

  const canLike = useMemo(
    () => currentUser?.features.includes("like:comment"),
    [currentUser?.features],
  );
  const canUnlike = useMemo(
    () => currentUser?.features.includes("unlike:comment"),
    [currentUser?.features],
  );
  const canReply = useMemo(
    () => currentUser?.features.includes("create:comment"),
    [currentUser?.features],
  );

  return {
    isEditing,
    isReplying,
    isThisFormSubmitting,
    isThisCommentBeingLiked,
    isAffectedByDeletion,
    isDisabled,
    canEdit,
    canDelete,
    canLike,
    canUnlike,
    canReply,
  };
}
