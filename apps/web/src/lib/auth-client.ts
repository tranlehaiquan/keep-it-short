import { createAuthClient } from "better-auth/react";

const currentURL = window.location.origin;
const baseURL = import.meta.env.PROD ? currentURL : "http://localhost:4000";

export const authClient = createAuthClient({
  baseURL,
});
