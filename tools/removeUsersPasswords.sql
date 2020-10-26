-- detete users passwords
ALTER TABLE "User" ALTER COLUMN "Password" DROP NOT NULL;
UPDATE "User" SET "Password" = NULL;

-- delete posts ips
Update "HiddenPost" SET "Ip" = NULL;
Update "JVCPost" SET "Ip" = NULL;

-- delete banned ips
DELETE FROM "BannedIp";