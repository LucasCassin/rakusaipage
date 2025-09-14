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
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  if (!canRead && !canCreate) {
    return null;
  }

  const shouldShowMainForm =
    currentUser && canCreate && activeForm.id === null && !isLoadingComments;

  const CommentList = (
    <>
      {isLoadingComments && <CommentsSkeleton />}
      {error && <p className="text-red-500 px-4">{error}</p>}

      {!isLoadingComments && !error && (
        <>
          {nestedComments.length > 0 ? (
            nestedComments.map((comment) => (
              // MUDANÇA 1: O container do comentário + respostas agora é 'relative'
              <div key={comment.id} className="relative">
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

                {/* MUDANÇA 2: A estrutura da thread foi alterada */}
                {comment.children && comment.children.length > 0 && (
                  <>
                    {/* A nova linha vertical com posicionamento absoluto */}
                    <div
                      className="absolute top-10 bottom-0 left-5 w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />

                    {/* Novo container para as respostas, para garantir o alinhamento correto */}
                    <div className="ml-[52px]">
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
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">
              Seja o(a) primeiro(a) a comentar!
            </p>
          )}
        </>
      )}
    </>
  );

  const MainForm = (
    <>
      {shouldShowMainForm && (
        <CommentForm
          content={mainFormContent}
          onContentChange={setMainFormContent}
          onSubmit={handleAddComment}
          isSubmitting={hookResult.isSubmitting === "main"}
          onFocus={closeOpenThread}
        />
      )}
    </>
  );

  return (
    // Container principal que define a altura máxima e o layout flexível
    <div className="w-full h-full max-h-[85vh] flex flex-col bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
      {/* 1. Cabeçalho Fixo (Título) */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white z-10">
        <h2 className="text-xl font-bold">
          Comentários ({topLevelCommentCount})
        </h2>

        {/* Formulário para DESKTOP */}
        {shouldShowMainForm && (
          <div className="hidden md:block mt-2">{MainForm}</div>
        )}
      </div>

      {/* 2. Área de Conteúdo Rolável */}
      {canRead && (
        <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
          {CommentList}
        </div>
      )}

      {/* 3. Rodapé Fixo com Formulário (Apenas Mobile) */}
      {shouldShowMainForm && (
        <div className="md:hidden flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          {MainForm}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
