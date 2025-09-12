import React, { useMemo } from "react";
import { useComments } from "src/hooks/useComments";
import Comment from "./Comment";
import CommentForm from "../forms/CommentForm";
import { useAuth } from "src/contexts/AuthContext";

import LoadingSpinner from "components/ui/LoadingSpinner";

const CommentsSection = ({ videoId }) => {
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const {
    comments,
    isLoading: isLoadingComments,
    error,
    addComment,
    toggleLike,
    updateComment,
    deleteComment,
    activeForm,
    openReplyForm,
    openEditForm,
    closeActiveForm,
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
        />
        {comment.children.length > 0 && (
          <div className="ml-8 pl-4 border-l-2">
            {renderComments(comment.children)}
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
          <CommentForm onSubmit={addComment} />
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
