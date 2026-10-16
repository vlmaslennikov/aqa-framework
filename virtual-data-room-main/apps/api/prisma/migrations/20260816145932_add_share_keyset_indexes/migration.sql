-- DropIndex
DROP INDEX "Share_granteeEmail_idx";

-- DropIndex
DROP INDEX "Share_resourceType_resourceId_idx";

-- CreateIndex
CREATE INDEX "Share_resourceType_resourceId_createdAt_id_idx" ON "Share"("resourceType", "resourceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Share_granteeEmail_createdAt_id_idx" ON "Share"("granteeEmail", "createdAt", "id");
