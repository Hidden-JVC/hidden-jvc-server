SET timezone = 'Europe/Paris';

CREATE TYPE "UserType" AS ENUM ('User', 'Moderator', 'Admin');

-- Un utilisateur d'Hidden JVC
CREATE TABLE "User" (
    "Id" SERIAL,
    "Name" VARCHAR(15) NOT NULL UNIQUE,
    "Password" CHAR(60) NOT NULL,
    "Type" "UserType" NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

    PRIMARY KEY ("Id")
);

-- La session lié à un utilisateurs
CREATE TABLE "Session" (
    "Id" SERIAL,

    "UserId" INTEGER NOT NULL UNIQUE,
    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE CASCADE
);

-- Représente un forum JVC (ex: Forum 18-25 ans["Id"=51] ou Forum Informatique["Id"=1])
CREATE TABLE "JVCForum" (
    "Id" INTEGER NOT NULL, -- Native JVC forum id
    "Name" VARCHAR(200) NOT NULL,

    PRIMARY KEY ("Id")
);

-- Représente un topic natif de JVC
CREATE TABLE "JVCTopic" (
    "Id" INTEGER NOT NULL, -- Native JVC topic id
    "Title" VARCHAR(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL,

    "FirstPostContent" VARCHAR(8000) NOT NULL,
    "FirstPostUsername" VARCHAR(15) NOT NULL,

    "JVCForumId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("JVCForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

-- Représente un post d'Hidden JVC sur un topic natif JVC
CREATE TABLE "JVCPost" (
    "Id" SERIAL,
    "Content" VARCHAR(8000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Page" INTEGER NOT NULL, -- the page on which the post was created, might not be accurate if some actual jvc posts are removed

    "UserId" INTEGER NULL, -- logged in user
    "Username" VARCHAR(15) NULL, -- anonymous user

    "JVCTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCTopicId") REFERENCES "JVCTopic" ("Id") ON DELETE CASCADE
);

-- Représente un topic d'Hidden JVC complétement indépendant de JVC
CREATE TABLE "HiddenTopic" (
    "Id" SERIAL,
    "Title" VARCHAR(100) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Locked" BOOLEAN NOT NULL DEFAULT FALSE,
    "JVCBackup" BOOLEAN NOT NULL DEFAULT FALSE, -- Si TRUE alors le topic est un backup d'un vrai topic jvc qui a été supprimé

    "UserId" INTEGER NULL, -- logged in user
    "Username" VARCHAR(15) NULL, -- anonymous user
    "JVCForumId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("JVCForumId") REFERENCES "JVCForum" ("Id") ON DELETE CASCADE
);

-- Représente un post sur un topic indépendant d'Hidden JVC
CREATE TABLE "HiddenPost" (
    "Id" SERIAL,
    "Content" VARCHAR(8000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UserId" INTEGER NULL,
    "Username" VARCHAR(20) NULL, -- only used when "UserId" is NULL

    "HiddenTopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL,
    FOREIGN KEY ("HiddenTopicId") REFERENCES "HiddenTopic" ("Id") ON DELETE CASCADE
);

CREATE INDEX "HiddenPost_TopicId_Index" ON "HiddenPost" ("HiddenTopicId");

CREATE OR REPLACE FUNCTION "JVCTopicListJson" (
	IN "_TopicIds" VARCHAR DEFAULT NULL,
    IN "_Offset" INTEGER DEFAULT 0,
    IN "_Limit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "JVCTopic".*,
			'PostsCount', (SELECT COUNT(*) FROM "JVCPost" WHERE "JVCPost"."JVCTopicId" = "JVCTopic"."Id")
		)
        FROM "JVCTopic"
		CROSS JOIN LATERAL (
			SELECT MAX("CreationDate") AS "CreationDate"
			FROM "JVCPost"
			WHERE "JVCPost"."JVCTopicId" = "JVCTopic"."Id"
		) "LastJVCPost"
		WHERE ("_TopicIds" IS NULL OR "JVCTopic"."Id" = ANY(string_to_array("_TopicIds", ',')::INT[]))
        ORDER BY "LastJVCPost"."CreationDate" DESC
        OFFSET "_Offset"
        LIMIT "_Limit";
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
                            'Username', "JVCPost"."Username",
                            'Page', "JVCPost"."Page"
                        ),
                        'User', CASE WHEN "PostUser"."Id" IS NULL
                            THEN NULL
                            ELSE json_build_object(
                                'Id', "PostUser"."Id",
                                'Name', "PostUser"."Name"
                            ) END
                    )
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
            SELECT *
            FROM "User"
            WHERE "User"."Id" = "JVCPost"."UserId"
        ) "PostUser" ON TRUE
        WHERE "JVCTopic"."Id" = "_TopicId"
        GROUP BY "JVCTopic"."Id";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "HiddenTopicListJson" (
    IN "_Pinned" BOOLEAN DEFAULT NULL,
    IN "_Offset" INTEGER DEFAULT 0,
    IN "_Limit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "HiddenTopic".*,
            'LastPostDate', "LastHiddenPost"."CreationDate",
            'Author', CASE WHEN "User"."Id" IS NULL
				THEN NULL
                ELSE json_build_object(
					'Id', "User"."Id",
					'Name', "User"."Name"
				)
			END,
			'PostsCount', (SELECT COUNT(*) FROM "HiddenPost" WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id") - 1
		)
        FROM "HiddenTopic"
        LEFT JOIN "User" ON "User"."Id" = "HiddenTopic"."UserId"
		CROSS JOIN LATERAL (
			SELECT MAX("CreationDate") AS "CreationDate"
			FROM "HiddenPost"
			WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id"
		) "LastHiddenPost"
        WHERE ("_Pinned" IS NULL OR "HiddenTopic"."Pinned" = "_Pinned")
        ORDER BY "LastHiddenPost"."CreationDate" DESC
        OFFSET "_Offset"
        LIMIT "_Limit";
    END
$BODY$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "HiddenTopicPostsJson" (
    IN "_TopicId" INTEGER,
    IN "_PostOffset" INTEGER DEFAULT 0,
    IN "_PostLimit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "HiddenTopic".*,
            'User', CASE WHEN "User"."Id" IS NULL THEN NULL
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
                            'Username', "HiddenPost"."Username"
                        ),
                    'User', CASE WHEN "PostUser"."Id" IS NULL THEN NULL
                        ELSE json_build_object(
                            'Id', "PostUser"."Id",
                            'Name', "PostUser"."Name"
                        )
                        END
                )
            ),
            'PostsCount', MIN("HiddenPost"."Count")
        )
        FROM "HiddenTopic"
        LEFT JOIN "User" ON "User"."Id" = "HiddenTopic"."UserId"
        LEFT JOIN LATERAL (
            SELECT *, COUNT(*) OVER() AS "Count"
            FROM "HiddenPost"
            WHERE "HiddenPost"."HiddenTopicId" = "HiddenTopic"."Id"
            ORDER BY "HiddenPost"."CreationDate" ASC
            OFFSET "_PostOffset"
            LIMIT "_PostLimit"
        ) "HiddenPost" ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM "User"
            WHERE "User"."Id" = "HiddenPost"."UserId"
        ) "PostUser" ON TRUE
        WHERE "HiddenTopic"."Id" = "_TopicId"
        GROUP BY "HiddenTopic"."Id", "User"."Id";
    END
$BODY$
LANGUAGE plpgsql;

-- DROP INDEX "HiddenPost_TopicId_Index";
-- DROP FUNCTION "JVCTopicListJson";
-- DROP FUNCTION "JVCTopicPostsJson";
-- DROP FUNCTION "HiddenTopicListJson";
-- DROP FUNCTION "HiddenTopicPostsJson";
-- DROP TABLE "HiddenPost";
-- DROP TABLE "HiddenTopic";
-- DROP TABLE "JVCPost";
-- DROP TABLE "JVCTopic";
-- DROP TABLE "JVCForum";
-- DROP TABLE "Session";
-- DROP TABLE "User";
-- DROP TYPE "UserType";