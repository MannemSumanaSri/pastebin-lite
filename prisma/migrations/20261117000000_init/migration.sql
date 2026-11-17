-- CreateTable
CREATE TABLE "Paste" (
    "id" VARCHAR(32) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "maxViews" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Paste_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Paste_content_nonempty" CHECK (char_length(btrim("content")) > 0),
    CONSTRAINT "Paste_viewCount_nonnegative" CHECK ("viewCount" >= 0),
    CONSTRAINT "Paste_maxViews_positive" CHECK ("maxViews" IS NULL OR "maxViews" >= 1),
    CONSTRAINT "Paste_viewCount_within_max" CHECK ("maxViews" IS NULL OR "viewCount" <= "maxViews")
);

-- CreateIndex
CREATE INDEX "Paste_expiresAt_idx" ON "Paste"("expiresAt");

-- CreateIndex
CREATE INDEX "Paste_createdAt_idx" ON "Paste"("createdAt");
