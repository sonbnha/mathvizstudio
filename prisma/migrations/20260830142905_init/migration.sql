-- CreateTable
CREATE TABLE "LicenseKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "customerName" TEXT,
    "totalCredits" INTEGER NOT NULL DEFAULT 50,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseKey_key_key" ON "LicenseKey"("key");
