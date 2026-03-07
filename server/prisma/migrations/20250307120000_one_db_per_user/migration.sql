-- One DB per user: allow row without URL (Genezio created but URL not in response); store genezio name to avoid creating a second DB
ALTER TABLE "UserDatabase" ADD COLUMN IF NOT EXISTS "genezioDbName" TEXT;
ALTER TABLE "UserDatabase" ALTER COLUMN "encryptedUrl" DROP NOT NULL;
