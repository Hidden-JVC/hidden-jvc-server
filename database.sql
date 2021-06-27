SET timezone = 'Europe/Paris';

CREATE TABLE "User" (
    "Id" SERIAL,
    "Name" CHARACTER VARYING(15) NOT NULL UNIQUE CONSTRAINT "User_Name_Min_Length_Check" CHECK("Name" ~ '^[a-zA-Z0-9\-_\[\]]{3,15}$'),
    "Password" CHARACTER(60) NOT NULL,
    "IsAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
    "Banned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Email" CHARACTER VARYING(50) NULL,
    "ProfilePicture" CHARACTER VARYING(200) NULL,
    "Signature" CHARACTER VARYING(400) NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),
    "PostCount" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX "User_UniqueLowerName_Index" ON "User"(lower("Name"));

CREATE TABLE "Badge" (
    "Id" SERIAL,
    "Name" CHARACTER VARYING(50) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),
    "Description" CHARACTER VARYING(500) NOT NULL,

    PRIMARY KEY ("Id")
);

CREATE TABLE "UserBadge" (
    "UserId" INTEGER NOT NULL,
    "BadgeId" INTEGER NOT NULL,
    "AssociationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

    PRIMARY KEY ("UserId", "BadgeId"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("BadgeId") REFERENCES "Badge" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Session" (
    "Id" SERIAL,
    "UserId" INTEGER NOT NULL UNIQUE,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE
);

CREATE TABLE "JVCForum" (
    "Id" INTEGER NOT NULL, -- Native JVC forum id
    "Name" CHARACTER VARYING(200) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY ("Id")
);

CREATE TYPE "ModerationAction" AS ENUM (
    'DeleteTopic', 'DeletePost',
    'Pin', 'UnPin',
    'Lock', 'UnLock',
    'BanIp', 'UnBanIp',
    'BanAccount', 'UnBanAccount',
    'ModifyTag'
);

CREATE TABLE "Moderator" (
    "UserId" INTEGER NOT NULL,
    "ForumId" INTEGER NOT NULL,
    "Actions" "ModerationAction"[] NOT NULL,

    PRIMARY KEY ("UserId", "ForumId"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("ForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

CREATE TABLE "JVCTopic" (
    "Id" INTEGER NOT NULL, -- Native JVC topic id
    "Title" CHARACTER VARYING(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL,
    "IsTitleVerified" BOOLEAN DEFAULT FALSE,
    "PostCount" INTEGER NOT NULL DEFAULT 1, -- updated by trigger: UpdateHiddenTopicLastPostDate
    "LastPostCreationDate" TIMESTAMP NOT NULL DEFAULT NOW(), -- updated by trigger: UpdateHiddenTopicLastPostDate

    "FirstPostContent" CHARACTER VARYING(8000) NOT NULL,
    "FirstPostUsername" CHARACTER VARYING(15) NOT NULL,

    "JVCForumId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("JVCForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

CREATE INDEX "JVCTopic_LowerTitle_Index" ON "JVCTopic"(lower("Title"));

CREATE TABLE "JVCPost" (
    "Id" SERIAL,
    "Content" CHARACTER VARYING(16000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ModificationDate" TIMESTAMP NULL,
    "Page" INTEGER NOT NULL, -- the page on which the post was created, might not be accurate if some actual jvc posts are removed
    "Ip" INET NULL,

    "UserId" INTEGER NULL,

    "JVCTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCTopicId") REFERENCES "JVCTopic" ("Id") ON DELETE CASCADE
);

CREATE TABLE "HiddenTopic" (
    "Id" SERIAL,
    "Title" CHARACTER VARYING(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "DeletionDate" TIMESTAMP NULL,
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Locked" BOOLEAN NOT NULL DEFAULT FALSE,
    "PostCount" INTEGER NOT NULL DEFAULT 1, -- updated by trigger: UpdateHiddenTopicLastPostDate
    "LastPostCreationDate" TIMESTAMP NOT NULL DEFAULT NOW(), -- updated by trigger: UpdateHiddenTopicLastPostDate

    "UserId" INTEGER NULL,
    "JVCForumId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

CREATE INDEX "HiddenTopic_LowerTitle_Index" ON "HiddenTopic"(lower("Title"));

CREATE TABLE "TopicTag" (
    "Id" SERIAL,
    "Name" CHARACTER VARYING(100) NOT NULL,
    "Color" CHARACTER VARYING(15) NOT NULL,

    PRIMARY KEY ("Id")
);

CREATE TABLE "HiddenTopicTag" (
    "TopicId" INTEGER NOT NULL,
    "TagId" INTEGER NOT NULL,
    "Locked" BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY ("TopicId", "TagId"),
    FOREIGN KEY ("TopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("TagId") REFERENCES "TopicTag" ("Id") ON DELETE CASCADE
);

CREATE TABLE "HiddenPost" (
    "Id" SERIAL,
    "Content" CHARACTER VARYING(16000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ModificationDate" TIMESTAMP NULL,
    "DeletionDate" TIMESTAMP NULL,
    "Op" BOOLEAN NOT NULL DEFAULT FALSE,
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Ip" INET NULL,

    "UserId" INTEGER NULL,
    "QuotedPostId" INTEGER NULL,

    "HiddenTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("QuotedPostId") REFERENCES "HiddenPost" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE
);

CREATE INDEX "HiddenPost_TopicId_Index" ON "HiddenPost" ("HiddenTopicId");

CREATE TABLE "Report" (
    "Id" SERIAL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Reason" CHARACTER VARYING(2000) NOT NULL,
    "Comment" CHARACTER VARYING(2000) NOT NULL,
    "UserId" INTEGER NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE TABLE "ModerationLog" (
    "Id" SERIAL,
    "Action" "ModerationAction" NOT NULL,
    "Reason" CHARACTER VARYING(300) NULL,
    "UserId" INTEGER NOT NULL,
    "ForumId" INTEGER NOT NULL,
    "JVCTopicId" INTEGER NULL,
    "HiddenTopicId" INTEGER NULL,
    "Date" TIMESTAMP NOT NULL DEFAULT NOW()::TIMESTAMP(0),
    "Label" CHARACTER VARYING(500) NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id"),
    FOREIGN KEY ("JVCTopicId") REFERENCES "JVCTopic" ("Id"),
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id"),
    FOREIGN KEY ("ForumId") REFERENCES "JVCForum" ("Id")
);

CREATE TABLE "Survey" (
    "Id" SERIAL,
    "Question" CHARACTER VARYING(300) NOT NULL,
    "IsOpen" BOOLEAN DEFAULT TRUE,

    "HiddenTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE
);

CREATE TABLE "QuoteNotification" (
    "UserId" INTEGER NOT NULL,
    "HiddenPostId" INTEGER NOT NULL,
    "Seen" BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("HiddenPostId") REFERENCES "HiddenPost" ("Id") ON DELETE CASCADE
);

CREATE TABLE "SurveyOption" (
    "Id" SERIAL,
    "Label" CHARACTER VARYING(300) NOT NULL,

    "SurveyId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("SurveyId") REFERENCES "Survey" ("Id") ON DELETE CASCADE
);

CREATE TABLE "SurveyAnswer" (
    "SurveyId" INTEGER NOT NULL,
    
    "UserId" INTEGER NULL,
    "SurveyOptionId" INTEGER NOT NULL,

    PRIMARY KEY ("SurveyId", "UserId", "SurveyOptionId"),
    FOREIGN KEY ("SurveyId") REFERENCES "Survey" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("SurveyOptionId") REFERENCES "SurveyOption" ("Id") ON DELETE CASCADE
);

CREATE TABLE "BannedIp" (
    "Ip" INET,
    "Reason" CHARACTER VARYING(300) NULL,
    "StartDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),
    "EndDate" TIMESTAMP NULL,

    PRIMARY KEY ("Ip")
);

CREATE OR REPLACE FUNCTION "UpdateHiddenTopicLastPostDate" ()
RETURNS TRIGGER AS
$BODY$
    BEGIN
        UPDATE "HiddenTopic"
        SET
            "LastPostCreationDate" = NEW."CreationDate",
            "PostCount" = (SELECT COUNT(*) FROM "HiddenPost" WHERE "HiddenTopicId" = NEW."HiddenTopicId")
        WHERE "Id" = NEW."HiddenTopicId";

        UPDATE "User"
        SET "PostCount" =
            (SELECT COUNT(*) FROM "HiddenPost" WHERE "UserId" = "User"."Id") +
            (SELECT COUNT(*) FROM "JVCPost" WHERE "UserId" = "User"."Id");

        RETURN NEW;
    END
$BODY$
LANGUAGE plpgsql;

CREATE TRIGGER "Trigger_UpdateHiddenTopicLastPostDate"
AFTER INSERT OR DELETE ON "HiddenPost"
FOR EACH ROW
EXECUTE FUNCTION "UpdateHiddenTopicLastPostDate"();

CREATE OR REPLACE FUNCTION "UpdateJVCTopicLastPostDate" ()
RETURNS TRIGGER AS
$BODY$
    BEGIN
        UPDATE "JVCTopic"
        SET
            "LastPostCreationDate" = NEW."CreationDate",
            "PostCount" = (SELECT COUNT(*) FROM "JVCPost" WHERE "JVCTopicId" = NEW."JVCTopicId")
        WHERE "Id" = NEW."JVCTopicId";

        UPDATE "User"
        SET "PostCount" =
            (SELECT COUNT(*) FROM "HiddenPost" WHERE "UserId" = "User"."Id") +
            (SELECT COUNT(*) FROM "JVCPost" WHERE "UserId" = "User"."Id");

        RETURN NEW;
    END
$BODY$
LANGUAGE plpgsql;

CREATE TRIGGER "Trigger_UpdateJVCTopicLastPostDate"
AFTER INSERT OR DELETE ON "JVCPost"
FOR EACH ROW
EXECUTE FUNCTION "UpdateJVCTopicLastPostDate"();

CREATE OR REPLACE FUNCTION "JVCTopicListJson" (
	IN "_TopicIds" CHARACTER VARYING DEFAULT NULL -- comma separated list of JVCTopic Id
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "JVCTopic".*,
            'PostsCount', (SELECT COUNT(*) FROM "JVCPost" WHERE "JVCPost"."JVCTopicId" = "JVCTopic"."Id")
        )
        FROM "JVCTopic"
        WHERE ("_TopicIds" IS NULL OR "JVCTopic"."Id" = ANY(string_to_array("_TopicIds", ',')::INTEGER[]));
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "JVCTopicPostsJson" (
    IN "_TopicId" INTEGER,
    IN "_startDate" TIMESTAMP,
    IN "_endDate" TIMESTAMP DEFAULT NULL
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "JVCTopic".*,
            'Posts', CASE WHEN MIN("JVCPost"."Id") IS NULL
                THEN '[]'::json
                ELSE json_agg(
                    json_build_object(
                        'Post', json_build_object(
                            'Id', "JVCPost"."Id",
                            'Content', "JVCPost"."Content",
                            'CreationDate', "JVCPost"."CreationDate",
                            'ModificationDate', "JVCPost"."ModificationDate",
                            'Page', "JVCPost"."Page"
                        ),
                        'User', json_build_object(
                            'Id', "PostUser"."Id",
                            'Name', "PostUser"."Name",
                            'IsAdmin', "PostUser"."IsAdmin",
                            'IsModerator', "PostModerator"."UserId" IS NOT NULL
                        )
                    ) ORDER BY "JVCPost"."CreationDate" ASC
                ) END,
			'Pages', (SELECT array_agg(DISTINCT "Page") FROM "JVCPost" WHERE "JVCPost"."JVCTopicId" = "JVCTopic"."Id")
        )
        FROM "JVCTopic"
        LEFT JOIN LATERAL (
            SELECT *
            FROM "JVCPost"
            WHERE "JVCPost"."JVCTopicId" = "JVCTopic"."Id"
            AND "JVCPost"."CreationDate" >= "_startDate"
            AND ("_endDate" IS NULL OR "JVCPost"."CreationDate" <= "_endDate")
            ORDER BY "JVCPost"."CreationDate" ASC
        ) "JVCPost" ON TRUE
        LEFT JOIN LATERAL (
            SELECT "Id", "Name", "IsAdmin"
            FROM "User"
            WHERE "User"."Id" = "JVCPost"."UserId"
        ) "PostUser" ON TRUE
        LEFT JOIN LATERAL (
            SELECT "UserId"
            FROM "Moderator"
            WHERE "Moderator"."UserId" = "PostUser"."Id"
            AND "Moderator"."ForumId" = "JVCTopic"."JVCForumId"
        ) "PostModerator" ON TRUE
        WHERE "JVCTopic"."Id" = "_TopicId"
        GROUP BY "JVCTopic"."Id";
    END
$BODY$
LANGUAGE plpgsql;

INSERT INTO "TopicTag" ("Name", "Color")
VALUES
    ('Porn', 'pink lighten-3'),
    ('Gore', 'black'),
    ('Politique', 'blue darken-2'),
    ('Fic', 'orange darken-1'),
    ('Boucle', 'red'),
    ('TALC', 'purple');

INSERT INTO "Badge" ("Name", "Description")
VALUES
    ('Bêta-Testeur', 'Avoir été là lors de la bêta');

-- SELECT
-- 	(SELECT COUNT(*) FROM "HiddenTopic") AS "HiddenTopicCount",
-- 	(SELECT COUNT(*) FROM "HiddenTopic" WHERE "CreationDate" >= NOW() - INTERVAL '24 HOURS') AS "HiddenTopicCountLast24Hours",
-- 	(SELECT COUNT(*) FROM "HiddenPost") AS "HiddenPostCount",
-- 	(SELECT COUNT(*) FROM "JVCTopic") AS "JVCTopicCount",
-- 	(SELECT COUNT(*) FROM "JVCPost") AS "JVCPostCount",
-- 	(SELECT COUNT(*) FROM "User") AS "UserCount"
