import React, { useMemo, useState } from "react";
import { useComments } from "src/hooks/useComments";
import Comment from "./Comment";
import CommentForm from "../forms/CommentForm";
import { useAuth } from "src/contexts/AuthContext";
import LoadingSpinner from "components/ui/LoadingSpinner";
import ReplyThread from "./ReplyThread";
import CommentsSkeleton from "./CommentsSkeleton";

const CommentsSection = ({ videoId }) => {
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const hookResult = useComments({ videoId, user: currentUser, isLoadingAuth });
  const {
    comments,
    isLoading: isLoadingComments,
    error,
    addComment,
    activeForm,
    openReplyForm,
    openEditForm,
    closeActiveForm,
    closeOpenThread,
  } = hookResult;

  const [mainFormContent, setMainFormContent] = useState("");
  const canCreate = currentUser?.features.includes("create:comment");
  const canRead = currentUser?.features.includes("read:comment");

  const handleAddComment = async (content) => {
    const success = await addComment(content);
    if (success) {
      setMainFormContent("");
    }
    return success;
  };

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

  const topLevelCommentCount = useMemo(() => {
    return (comments || []).filter((comment) => !comment.parent_id).length;
  }, [comments]);

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }
  if (!canRead && !canCreate) {
    return null;
  }

  return (
    <div className="w-full mx-auto p-4">
      {canRead && (
        <>
          <h2 className="text-xl font-bold mb-4">
            Comentários ({topLevelCommentCount})
          </h2>

          {isLoadingComments && <CommentsSkeleton />}
          {error && <p className="text-red-500">{error}</p>}

          {!isLoadingComments && !error && (
            <div>
              {nestedComments.length > 0 ? (
                // MUDANÇA: O map agora é muito mais simples
                nestedComments.map((comment) => (
                  <div key={comment.id}>
                    <Comment
                      comment={comment}
                      currentUser={currentUser}
                      onReply={hookResult.addComment}
                      onLike={hookResult.toggleLike}
                      onUpdate={hookResult.updateComment}
                      onDelete={hookResult.deleteComment}
                      onSetReply={() =>
                        openReplyForm(
                          comment.id,
                          hookResult.openThread.visibleCount,
                        )
                      }
                      onSetEdit={() => openEditForm(comment.id)}
                      onCancel={closeActiveForm}
                      activeForm={hookResult.activeForm}
                      isSubmitting={hookResult.isSubmitting}
                      likingCommentId={hookResult.likingCommentId}
                      deletingCommentId={hookResult.deletingCommentId}
                    />
                    {comment.children && comment.children.length > 0 && (
                      <div className="ml-[1.25rem] pl-[2rem] border-l-2">
                        <ReplyThread
                          parentComment={comment}
                          currentUser={currentUser}
                          onReply={hookResult.addComment}
                          onLike={hookResult.toggleLike}
                          onUpdate={hookResult.updateComment}
                          onDelete={hookResult.deleteComment}
                          onSetReply={openReplyForm}
                          onSetEdit={openEditForm}
                          onCancel={closeActiveForm}
                          activeForm={hookResult.activeForm}
                          isSubmitting={hookResult.isSubmitting}
                          likingCommentId={hookResult.likingCommentId}
                          deletingCommentId={hookResult.deletingCommentId}
                          openThread={hookResult.openThread}
                          toggleReplies={hookResult.toggleReplies}
                          showMoreReplies={hookResult.showMoreReplies}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>Seja o(a) primeiro(a) a comentar!</p>
              )}
            </div>
          )}
        </>
      )}

      {currentUser &&
        canCreate &&
        activeForm.id === null &&
        !isLoadingComments && (
          <div className="mt-6">
            <CommentForm
              content={mainFormContent}
              onContentChange={setMainFormContent}
              onSubmit={handleAddComment}
              isSubmitting={hookResult.isSubmitting === "main"}
              onFocus={closeOpenThread}
            />
          </div>
        )}
    </div>
  );
};

export default CommentsSection;
