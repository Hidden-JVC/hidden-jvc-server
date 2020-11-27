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

    PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX "User_UniqueLowerName_Index" ON "User"(lower("Name"));

CREATE TABLE "Badge" (
    "Id" SERIAL,
    "Name" CHARACTER VARYING(50) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

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

    PRIMARY KEY ("Id")
);

CREATE TYPE "ModerationAction" AS ENUM (
    'Delete',
    'Pin', 'UnPin',
    'Lock', 'UnLock',
    'BanIp', 'UnBanIp',
    'BanAccount', 'UnBanAccount'
);

CREATE TABLE "Moderator" (
    "UserId" INTEGER NOT NULL,
    "ForumId" INTEGER NOT NULL,
    "Actions" "ModerationAction"[] NOT NULL,

    PRIMARY KEY ("UserId", "ForumId"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("ForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

CREATE TABLE "ModerationLog" (
    "Id" SERIAL,
    "Action" "ModerationAction" NOT NULL,
    "Reason" CHARACTER VARYING(300) NULL,
    "UserId" INTEGER NULL,
    "Date" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),
    "Label" CHARACTER VARYING(500) NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE TABLE "JVCTopic" (
    "Id" INTEGER NOT NULL, -- Native JVC topic id
    "Title" CHARACTER VARYING(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL,
    "IsTitleSafe" BOOLEAN DEFAULT FALSE,

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
    "Username" CHARACTER VARYING(15) NULL,

    "JVCTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCTopicId") REFERENCES "JVCTopic" ("Id") ON DELETE CASCADE
);

CREATE TABLE "HiddenTopic" (
    "Id" SERIAL,
    "Title" CHARACTER VARYING(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Locked" BOOLEAN NOT NULL DEFAULT FALSE,
    "JVCBackup" BOOLEAN NOT NULL DEFAULT FALSE, -- Si TRUE alors le topic est un backup d'un vrai topic jvc qui a été supprimé

    "UserId" INTEGER NULL, -- logged in user
    "Username" CHARACTER VARYING(15) NULL, -- anonymous user
    "JVCForumId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

CREATE INDEX "HiddenTopic_LowerTitle_Index" ON "HiddenTopic"(lower("Title"));

CREATE TABLE "HiddenTag" (
    "Id" SERIAL,
    "Name" CHARACTER VARYING(100) NOT NULL,

    PRIMARY KEY ("Id")
);

CREATE TABLE "HiddenTopicTag" (
    "TopicId" INTEGER NOT NULL,
    "TagId" INTEGER NOT NULL,

    PRIMARY KEY ("TopicId", "TagId"),
    FOREIGN KEY ("TopicId") REFERENCES "HiddenTopic" ("Id"),
    FOREIGN KEY ("TagId") REFERENCES "HiddenTag" ("Id")
);

CREATE TABLE "HiddenPost" (
    "Id" SERIAL,
    "Content" CHARACTER VARYING(16000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ModificationDate" TIMESTAMP NULL,
    "Op" BOOLEAN NOT NULL DEFAULT FALSE,
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Ip" INET NULL,

    "UserId" INTEGER NULL,  -- logged in user
    "Username" CHARACTER VARYING(15) NULL, -- anonymous user

    "HiddenTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE
);

CREATE INDEX "HiddenPost_TopicId_Index" ON "HiddenPost" ("HiddenTopicId");

CREATE TABLE "Survey" (
    "Id" SERIAL,
    "Question" CHARACTER VARYING(300) NOT NULL,
    "IsOpen" BOOLEAN DEFAULT TRUE,

    "HiddenTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE
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

CREATE OR REPLACE FUNCTION "UserJson" (
    IN "_UserName" VARCHAR
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'User', json_build_object (
                'Id', "User"."Id",
                'Name', "User"."Name",
                'CreationDate', "User"."CreationDate",
                'Banned', "User"."Banned",
                'Email', "User"."Email",
                'ProfilePicture', "User"."ProfilePicture",
                'Signature', "User"."Signature"
            ),
            'Badges',CASE WHEN MIN("Badge"."Id") IS NULL THEN '[]'::json ELSE
                json_agg(
                    json_build_object(
                        'Id', "Badge"."Id",
                        'Name', "Badge"."Name",
                        'AssociationDate', "UserBadge"."AssociationDate"
                    )
                ) END
        )
        FROM "User"
        LEFT JOIN "UserBadge"
            ON "User"."Id" = "UserBadge"."UserId"
        LEFT JOIN "Badge"
            ON "Badge"."Id" = "UserBadge"."BadgeId"
        WHERE "User"."Name" = "_UserName"
        GROUP BY "User"."Id";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "ModerationLogJson" (
	IN "_Offset" INTEGER DEFAULT 0,
    IN "_Limit" INTEGER DEFAULT 20,
    IN "_UserId" INTEGER DEFAULT NULL
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'ModerationLog', "ModerationLog".*,
            'User', json_build_object (
                'Name', "User"."Name"
            )
        )
        FROM "ModerationLog"
        INNER JOIN "User"
            ON "ModerationLog"."UserId" = "User"."Id"
        WHERE ("_UserId" IS NULL OR "_UserId" = "User"."Id")
        ORDER BY "ModerationLog"."Date" DESC
        OFFSET "_Offset"
        LIMIT "_Limit";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "JVCForumListJson" (
    IN "_Offset" INTEGER DEFAULT 0,
    IN "_Limit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Forum', "JVCForum".*,
			'JVCTopicCount', (
				SELECT COUNT(*)
				FROM "JVCTopic"
			    WHERE "JVCForumId" = "JVCForum"."Id"
			 ),
			'JVCPostCount', (
				SELECT COUNT(*)
				FROM "JVCPost"
				JOIN "JVCTopic"
					ON "JVCTopic"."Id" = "JVCPost"."JVCTopicId"
				WHERE  "JVCTopic"."JVCForumId" = "JVCForum"."Id"
			),
			'HiddenTopicCount', (
				SELECT COUNT(*)
				FROM "HiddenTopic"
				WHERE "JVCForumId" = "JVCForum"."Id"
		 	),
			'HiddenPostCount', (
				SELECT COUNT(*)
				FROM "HiddenPost"
				JOIN "HiddenTopic"
					ON "HiddenTopic"."Id" = "HiddenPost"."HiddenTopicId"
				WHERE  "HiddenTopic"."JVCForumId" = "JVCForum"."Id"
		 	)
		)
        FROM "JVCForum"
        OFFSET "_Offset"
        LIMIT "_Limit";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "JVCForumJson" (
    IN "_ForumId" INTEGER
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object (
            'Forum', "JVCForum".*,
            'Moderators', CASE WHEN MIN("Moderator"."ForumId") IS NOT NULL THEN json_agg (
                json_build_object (
                    'Id', "User"."Id",
                    'Name', "User"."Name"
                )
            ) ELSE '[]'::json END
        )
        FROM "JVCForum"
        LEFT JOIN "Moderator"
            ON "Moderator"."ForumId" = "JVCForum"."Id"
        LEFT JOIN "User"
            ON "User"."Id" = "Moderator"."UserId"
        WHERE "JVCForum"."Id" = "_ForumId"
        GROUP BY "JVCForum"."Id";
    END
$BODY$
LANGUAGE plpgsql;

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
                            'Username', "JVCPost"."Username",
                            'Page', "JVCPost"."Page"
                        ),
                        'User', CASE WHEN "PostUser"."Id" IS NULL
                            THEN NULL
                            ELSE json_build_object(
                                'Id', "PostUser"."Id",
                                'Name', "PostUser"."Name",
					            'IsAdmin', "PostUser"."IsAdmin",
					            'IsModerator', "PostModerator"."UserId" IS NOT NULL OR "PostUser"."IsAdmin"
                            ) END
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

CREATE OR REPLACE FUNCTION "HiddenTopicListJson" (
    IN "_ForumId" INTEGER,
    IN "_Pinned" BOOLEAN DEFAULT NULL,
    IN "_Offset" INTEGER DEFAULT 0,
    IN "_Limit" INTEGER DEFAULT 20,
    IN "_startDate" TIMESTAMP DEFAULT NULL,
    IN "_endDate" TIMESTAMP DEFAULT NULL,
	IN "_Search" CHARACTER VARYING DEFAULT NULL,
	IN "_SearchType" CHARACTER VARYING DEFAULT NULL
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "HiddenTopic".*,
            'LastPostDate', "LastHiddenPost"."CreationDate",
            'Author', CASE WHEN "TopicAuthor"."Id" IS NULL
				THEN NULL
                ELSE json_build_object(
					'Id', "TopicAuthor"."Id",
					'Name', "TopicAuthor"."Name",
                    'IsAdmin', "TopicAuthor"."IsAdmin",
					'IsModerator', "AuthorModerator"."UserId" IS NOT NULL
				)
			END,
			'Tags', (
                SELECT array_agg("Name")
                FROM "HiddenTag"
                JOIN "HiddenTopicTag"
                ON "HiddenTag"."Id" = "HiddenTopicTag"."TagId"
                AND "HiddenTopicTag"."TopicId" = "HiddenTopic"."Id"
            ),
			'PostsCount', (
                SELECT COUNT(*)
                FROM "HiddenPost"
                WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id"
            ) - 1
		)
        FROM "HiddenTopic"
        LEFT JOIN "User" AS "TopicAuthor"
            ON "TopicAuthor"."Id" = "HiddenTopic"."UserId"
        LEFT JOIN "Moderator" AS "AuthorModerator"
            ON "AuthorModerator"."UserId" = "HiddenTopic"."UserId" AND "AuthorModerator"."ForumId" = "HiddenTopic"."JVCForumId"
		CROSS JOIN LATERAL (
			SELECT MAX("CreationDate") AS "CreationDate"
			FROM "HiddenPost"
			WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id"
		) "LastHiddenPost"
        WHERE "HiddenTopic"."JVCForumId" = "_ForumId"
        AND ("_startDate" IS NULL OR "LastHiddenPost"."CreationDate" <= "_startDate")
        AND ("_endDate" IS NULL OR "LastHiddenPost"."CreationDate" >= "_endDate")
        AND ("_Pinned" IS NULL OR "HiddenTopic"."Pinned" = "_Pinned")
        AND ("_Search" IS NULL OR "_SearchType" <> 'Title' OR lower("HiddenTopic"."Title") LIKE concat('%', lower("_Search"), '%'))
        AND ("_Search" IS NULL OR "_SearchType" <> 'Author' OR lower("TopicAuthor"."Name") LIKE concat('%', lower("_Search"), '%'))
        ORDER BY "HiddenTopic"."Pinned" DESC, "LastHiddenPost"."CreationDate" DESC
        OFFSET "_Offset"
        LIMIT "_Limit";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "HiddenTopicPostsJson" (
    IN "_TopicId" INTEGER,
    IN "_PostOffset" INTEGER DEFAULT 0,
    IN "_PostLimit" INTEGER DEFAULT 20,
    IN "_UserId" INTEGER DEFAULT NULL -- Used to only get post from a single user
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "HiddenTopic".*,
            'Author', CASE WHEN "User"."Id" IS NULL THEN NULL
                ELSE json_build_object(
                    'Id', "User"."Id",
                    'Name', "User"."Name"
                )
                END,
            'Posts', json_agg(
                json_build_object(
                    'Post', json_build_object(
                            'Id', "HiddenPost"."Id",
                            'Content', "HiddenPost"."Content",
                            'CreationDate', "HiddenPost"."CreationDate",
                            'ModificationDate', "HiddenPost"."ModificationDate",
                            'Op', "HiddenPost"."Op",
                            'Pinned', "HiddenPost"."Pinned",
                            'Username', "HiddenPost"."Username",
                            'IpBanned', "BannedIp"."Ip" IS NOT NULL
                        ),
                    'User', CASE WHEN "PostUser"."Id" IS NULL THEN NULL
                        ELSE json_build_object(
                            'Id', "PostUser"."Id",
                            'Name', "PostUser"."Name",
                            'IsAdmin', "PostUser"."IsAdmin",
                            'Banned', "PostUser"."Banned",
                            'ProfilePicture', "PostUser"."ProfilePicture",
                            'Signature', "PostUser"."Signature",
                            'IsModerator', "PostModerator"."UserId" IS NOT NULL
                        )
                        END
                ) ORDER BY "HiddenPost"."Op" DESC, "HiddenPost"."Pinned" DESC, "HiddenPost"."CreationDate" ASC
            ),
            'PostsCount', MIN("HiddenPost"."Count")
        )
        FROM "HiddenTopic"
        LEFT JOIN "User" ON "User"."Id" = "HiddenTopic"."UserId"
        LEFT JOIN LATERAL (
            SELECT *, COUNT(*) OVER() AS "Count"
            FROM "HiddenPost"
            WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id"
            AND ("_UserId" IS NULL OR ("HiddenPost"."UserId" = "_UserId"))
            ORDER BY "HiddenPost"."Op" DESC, "HiddenPost"."Pinned" DESC, "HiddenPost"."CreationDate" ASC
            OFFSET "_PostOffset"
            LIMIT "_PostLimit"
        ) "HiddenPost" ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM "User"
            WHERE "User"."Id" = "HiddenPost"."UserId"
        ) "PostUser" ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM "BannedIp"
            WHERE "BannedIp"."Ip" = "HiddenPost"."Ip"
        ) "BannedIp" ON TRUE
        LEFT JOIN LATERAL (
            SELECT "UserId"
            FROM "Moderator"
            WHERE "Moderator"."UserId" = "PostUser"."Id"
            AND "Moderator"."ForumId" = "HiddenTopic"."JVCForumId"
        ) "PostModerator" ON TRUE
        WHERE "HiddenTopic"."Id" = "_TopicId"
        GROUP BY "HiddenTopic"."Id", "User"."Id";
    END
$BODY$
LANGUAGE plpgsql;


SELECT
	(SELECT COUNT(*) FROM "HiddenTopic") AS "HiddenTopicCount",
	(SELECT COUNT(*) FROM "HiddenTopic" WHERE "CreationDate" >= NOW() - INTERVAL '24 HOURS') AS "HiddenTopicCountLast24Hours",
	(SELECT COUNT(*) FROM "HiddenPost") AS "HiddenPostCount",
	(SELECT COUNT(*) FROM "JVCTopic") AS "JVCTopicCount",
	(SELECT COUNT(*) FROM "JVCPost") AS "JVCPostCount",
	(SELECT COUNT(*) FROM "User") AS "UserCount"

