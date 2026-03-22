-- Add Comment and CommentLike tables for Instagram-style comments with replies

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentLike" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("commentId", "userId")
);

-- Indexes
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

-- Foreign keys
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
