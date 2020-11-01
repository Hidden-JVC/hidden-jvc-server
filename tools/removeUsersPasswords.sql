-- detete sensible data before creating the public backup

ALTER TABLE "User" ALTER COLUMN "Password" DROP NOT NULL;
UPDATE "User" SET "Password" = NULL;

Update "HiddenPost" SET "Ip" = NULL;
Update "JVCPost" SET "Ip" = NULL;

DELETE FROM "BannedIp";