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
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),
    "PostCount" INTEGER DEFAULT 0,

    "UserId" INTEGER,
    "Username" VARCHAR(20) NULL, -- only used when "UserId" is NULL

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Post" (
    "Id" SERIAL,
    "Content" VARCHAR(8000) NOT NULL,
    "CreationDate" TIMESTAMP NOT NULL DEFAULT NOW()::timestamp(0),

    "UserId" INTEGER,
    "Username" VARCHAR(20) NULL, -- only used when "UserId" is NULL

    "TopicId" INTEGER NOT NULL,

    PRIMARY KEY ("Id"),
    FOREIGN KEY ("TopicId") REFERENCES "Topic" ("Id") ON DELETE CASCADE,
    FOREIGN KEY ("UserId") REFERENCES "User" ("Id") ON DELETE SET NULL
);

-- DROP TABLE "Post"; DROP TABLE "Topic"; DROP TABLE "Session"; DROP TABLE "User"; DROP TYPE "UserType"