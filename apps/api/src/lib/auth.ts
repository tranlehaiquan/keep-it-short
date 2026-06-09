import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import db from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth-schema.js"; // Import all your schema tables

const plugins = [];

if (process.env.NODE_ENV === "development") {
  plugins.push(openAPI());
}

const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:4000"];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      console.log("Password reset requested:");
      console.log("  User:", user.email);
      console.log("  Reset URL:", url);
      console.log("  Token:", token);
    },
  },
  plugins,
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID as string,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  //   },
  // },
});
