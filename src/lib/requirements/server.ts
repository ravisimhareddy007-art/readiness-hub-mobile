// src/lib/requirements/server.ts
// The server boundary. createServerFn runs fetch.server.ts on the server (API key stays server-side)
// and is callable from the client like an RPC. Confirm the signature matches your
// @tanstack/react-start version.
import { createServerFn } from "@tanstack/react-start";
import { fetchRequirements } from "./fetch.server";

export const getRequirementsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { query: string; jurisdiction?: string }) => d)
  .handler(async ({ data }) => fetchRequirements(data.query, data.jurisdiction));
