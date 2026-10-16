-- CreateEnum
CREATE TYPE "ShareResourceType" AS ENUM ('DATAROOM', 'FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC_LINK', 'USER');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "resourceType" "ShareResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "token" TEXT,
    "granteeEmail" TEXT,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "createdById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Folder_dataRoomId_parentId_idx" ON "Folder"("dataRoomId", "parentId");

-- CreateIndex
CREATE INDEX "Folder_path_idx" ON "Folder"("path");

-- CreateIndex
CREATE INDEX "File_dataRoomId_folderId_idx" ON "File"("dataRoomId", "folderId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_resourceType_resourceId_idx" ON "Share"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Share_granteeEmail_idx" ON "Share"("granteeEmail");

-- AddForeignKey
ALTER TABLE "DataRoom" ADD CONSTRAINT "DataRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
