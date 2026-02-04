-- CreateTable
CREATE TABLE "MessageHash" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interviewId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    CONSTRAINT "MessageHash_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MessageHash_interviewId_idx" ON "MessageHash"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageHash_interviewId_contentHash_key" ON "MessageHash"("interviewId", "contentHash");
