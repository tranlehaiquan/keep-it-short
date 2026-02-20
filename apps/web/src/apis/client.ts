import type { AppType } from "../../../api/src/server";
import { hc } from "hono/client";

const client = hc<AppType>("/");

export default client;
