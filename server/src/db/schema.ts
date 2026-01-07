
import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, primaryKey } from "drizzle-orm/pg-core";
import type { SongNote } from "shared"; // Assuming shared types are set up, otherwise we define locally for now

// --- Auth Tables (Better-Auth) ---

export const users = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull()
});

export const sessions = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => users.id)
});

export const accounts = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => users.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull()
});

export const verifications = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt")
});

// --- App Tables ---

export const songs = pgTable("songs", {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("authorId").notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    slug: text("slug").notNull().unique(), // URL friendly ID
    songData: jsonb("songData").notNull(), // Stores notes, bpm, etc.
    difficulty: text("difficulty").notNull().default('MEDIUM'), // EASY, MEDIUM, HARD
    plays: integer("plays").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    isPublic: boolean("isPublic").notNull().default(false),
    coverUrl: text("coverUrl"),
    youtubeUrl: text("youtubeUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
});

export const likes = pgTable("likes", {
    userId: text("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid("songId").notNull().references(() => songs.id, { onDelete: 'cascade' }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.songId] }),
}));

export const favorites = pgTable("favorites", {
    userId: text("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid("songId").notNull().references(() => songs.id, { onDelete: 'cascade' }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.songId] }),
}));

export const ratings = pgTable("ratings", {
    userId: text("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid("songId").notNull().references(() => songs.id, { onDelete: 'cascade' }),
    score: integer("score").notNull(), // 1-5
    createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.songId] }),
}));
