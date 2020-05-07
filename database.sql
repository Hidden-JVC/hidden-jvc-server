CREATE TYPE "UserType" AS ENUM ('User', 'Moderator', 'Admin');

CREATE TABLE "User" (
    "Id" SERIAL,
    "Name" VARCHAR(20) NOT NULL UNIQUE,
    "Password" CHAR(60) NOT NULL,
    "Type" "UserType" NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

    PRIMARY KEY ("Id")
);

CREATE TABLE "Session" (
    "Id" SERIAL,

    "UserId" INTEGER NOT NULL UNIQUE,
    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Topic" (
    "Id" SERIAL,
    "Title" VARCHAR(300) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "Locked" BOOLEAN NOT NULL DEFAULT FALSE,

    "UserId" INTEGER NULL,
    "Username" VARCHAR(20) NULL, -- only used when "UserId" is NULL

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Post" (
    "Id" SERIAL,
    "Content" VARCHAR(8000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UserId" INTEGER NULL,
    "Username" VARCHAR(20) NULL, -- only used when "UserId" is NULL

    "TopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("TopicId") REFERENCES "Topic" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE INDEX "Post_TopicId_Index" ON "Post" ("TopicId");

CREATE FUNCTION "TopicListJson" (
    IN "InPinned" BOOLEAN DEFAULT NULL,
    IN "InOffset" INTEGER DEFAULT 0,
    IN "InLimit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "Topic".*,
            'LastPostDate', "LastPost"."CreationDate",
            'Author', CASE WHEN "User"."Id" IS NULL
				THEN NULL
                ELSE json_build_object(
					'Id', "User"."Id",
					'Name', "User"."Name"
				)
			END,
			'PostsCount', (SELECT COUNT(*) FROM "Post" WHERE "Post"."TopicId" = "Topic"."Id")
		)
        FROM "Topic"
        LEFT JOIN "User" ON "User"."Id" = "Topic"."UserId"
		CROSS JOIN LATERAL (
			SELECT MAX("CreationDate") AS "CreationDate"
			FROM "Post"
			WHERE "Post"."TopicId" = "Topic"."Id"
		) "LastPost"
        WHERE ("InPinned" IS NULL OR "Topic"."Pinned" = "InPinned")
        ORDER BY "LastPost"."CreationDate" DESC
        OFFSET "InOffset"
        LIMIT "InLimit";
    END
$BODY$
LANGUAGE plpgsql;

CREATE FUNCTION "TopicPostsJson" (
    IN "InTopicId" INTEGER,
    IN "PostOffset" INTEGER DEFAULT 0,
    IN "PostLimit" INTEGER DEFAULT 20
) RETURNS SETOF JSON AS
$BODY$
    BEGIN
        RETURN QUERY SELECT json_build_object(
            'Topic', "Topic".*,
            'User', CASE WHEN "User"."Id" IS NULL THEN NULL
                ELSE json_build_object(
                    'Id', "User"."Id",
                    'Name', "User"."Name"
                )
                END,
            'Posts', json_agg(
                json_build_object(
                    'Post', json_build_object(
                            'Id', "Post"."Id",
                            'Content', "Post"."Content",
                            'CreationDate', "Post"."CreationDate",
                            'Username', "Post"."Username"
                        ),
                    'User', CASE WHEN "PostUser"."Id" IS NULL THEN NULL
                        ELSE json_build_object(
                            'Id', "PostUser"."Id",
                            'Name', "PostUser"."Name"
                        )
                        END
                )
            ),
            'PostsCount', MIN("Post"."Count")
        )
        FROM "Topic"
        LEFT JOIN "User" ON "User"."Id" = "Topic"."UserId"
        LEFT JOIN LATERAL (
            SELECT *, COUNT(*) OVER() AS "Count"
            FROM "Post"
            WHERE "Post"."TopicId" = "Topic"."Id"
            ORDER BY "Post"."CreationDate" ASC
            OFFSET "PostOffset"
            LIMIT "PostLimit"
        ) "Post" ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM "User"
            WHERE "User"."Id" = "Post"."UserId"
        ) "PostUser" ON TRUE
        WHERE "Topic"."Id" = "InTopicId"
        GROUP BY "Topic"."Id", "User"."Id";
    END
$BODY$
LANGUAGE plpgsql;

-- DROP INDEX "Post_TopicId_Index"; DROP FUNCTION "TopicPostsJson"; DROP FUNCTION "TopicListJson"; DROP TABLE "Post"; DROP TABLE "Topic"; DROP TABLE "Session"; DROP TABLE "User"; DROP TYPE "UserType"