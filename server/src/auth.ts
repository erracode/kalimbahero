
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db"; // Drizzle client instance
import * as schema from "./db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // using PostgreSQL
        schema: {
            // Map better-auth tables to our schema if names differ, 
            // but we matched them in schema.ts so defaults should work.
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications
        }
    }),
    emailAndPassword: {
        enabled: true
    },
    // We can add social providers here later (Google, Discord, etc.)
    trustedOrigins: ["http://localhost:5173"],
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/api/auth",
});
