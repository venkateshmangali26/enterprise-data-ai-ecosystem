import { handleRequest } from "./app";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

export const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  fetch: handleRequest,
});

console.log(`🚀 Retail Analytics Full-Stack App running on http://${HOST}:${PORT}`);

export { handleRequest };
