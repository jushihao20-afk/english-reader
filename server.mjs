import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const indexFile = join(root, "public", "index.html");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(cleanPath === "/" ? "/public/index.html" : cleanPath);
  const fullPath = join(root, normalized);
  return fullPath.startsWith(root) ? fullPath : indexFile;
}

const server = createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");
  const target = existsSync(filePath) && statSync(filePath).isFile()
    ? filePath
    : indexFile;

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(target)] || "application/octet-stream"
  });
  createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`English Reader is running at http://${host}:${port}`);
});
