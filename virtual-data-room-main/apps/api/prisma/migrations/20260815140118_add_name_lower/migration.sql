-- AlterTable
ALTER TABLE "File" ADD COLUMN     "nameLower" TEXT;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "nameLower" TEXT;

-- Backfill existing rows before the column becomes NOT NULL
UPDATE "File" SET "nameLower" = lower(name) WHERE "nameLower" IS NULL;
UPDATE "Folder" SET "nameLower" = lower(name) WHERE "nameLower" IS NULL;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "nameLower" SET NOT NULL;
ALTER TABLE "Folder" ALTER COLUMN "nameLower" SET NOT NULL;

-- CreateIndex
CREATE INDEX "File_dataRoomId_folderId_nameLower_id_idx" ON "File"("dataRoomId", "folderId", "nameLower", "id");

-- CreateIndex
CREATE INDEX "Folder_dataRoomId_parentId_nameLower_id_idx" ON "Folder"("dataRoomId", "parentId", "nameLower", "id");
