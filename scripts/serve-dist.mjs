import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("dist");
const basePath = "/obradocs";
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host}`).pathname;
  const relativePath = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const requestedFile = resolve(root, relativePath.replace(/^\/+/, "") || "index.html");
  const safeFile = requestedFile.startsWith(`${root}${sep}`) || requestedFile === root;

  try {
    const body = await readFile(safeFile ? requestedFile : resolve(root, "index.html"));
    response.writeHead(200, { "Content-Type": mimeTypes[extname(requestedFile)] || "application/octet-stream" });
    response.end(body);
  } catch {
    const body = await readFile(resolve(root, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(body);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Obradocs web disponivel em http://127.0.0.1:${port}${basePath}/`);
});
