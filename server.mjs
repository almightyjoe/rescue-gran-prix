import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8080);
const lobbyTtlMs = Number(process.env.LOBBY_TTL_MS || 6 * 60 * 60 * 1000);
const lobbies = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function pruneLobbies() {
  const now = Date.now();
  for (const [code, lobby] of lobbies.entries()) {
    if (!lobby.updatedAt || now - lobby.updatedAt > lobbyTtlMs) {
      lobbies.delete(code);
    }
  }
}

function registryObject() {
  pruneLobbies();
  return Object.fromEntries([...lobbies.entries()].sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

function sanitizeLobby(code, lobby) {
  const cleanCode = String(code || lobby.code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  if (!cleanCode) throw new Error("Lobby code is required.");

  return {
    active: true,
    code: cleanCode,
    configVersion: Number(lobby.configVersion || 1),
    players: Array.isArray(lobby.players) ? lobby.players.slice(0, 4).map((player) => ({
      id: String(player.id || "").slice(0, 80),
      name: String(player.name || "Driver").slice(0, 18),
      readyVersion: Number(player.readyVersion || 0),
      host: Boolean(player.host),
    })) : [],
    updatedAt: Date.now(),
    config: lobby.config && typeof lobby.config === "object" ? lobby.config : undefined,
    trackKey: typeof lobby.trackKey === "string" ? lobby.trackKey : undefined,
    hazards: Array.isArray(lobby.hazards) ? lobby.hazards : undefined,
  };
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (url.pathname === "/api/lobbies" && request.method === "GET") {
    sendJson(response, 200, { lobbies: registryObject() });
    return true;
  }

  const match = url.pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]{1,8})$/);
  if (!match) return false;

  const code = match[1].toUpperCase();
  if (request.method === "GET") {
    pruneLobbies();
    sendJson(response, 200, { lobby: lobbies.get(code) || null, lobbies: registryObject() });
    return true;
  }

  if (request.method === "PUT") {
    try {
      const lobby = sanitizeLobby(code, await readRequestJson(request));
      lobbies.set(lobby.code, lobby);
      sendJson(response, 200, { lobby, lobbies: registryObject() });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid lobby payload." });
    }
    return true;
  }

  if (request.method === "DELETE") {
    lobbies.delete(code);
    sendJson(response, 200, { lobbies: registryObject() });
    return true;
  }

  sendJson(response, 405, { error: "Method not allowed." });
  return true;
}

async function serveStatic(response, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(root, `.${normalize(decodeURIComponent(requestPath))}`);
  if (!filePath.startsWith(resolve(root))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=60",
    });
    response.end(content);
  } catch {
    const fallback = await readFile(join(root, "index.html"));
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (await handleApi(request, response, url)) return;
  await serveStatic(response, url.pathname);
});

server.listen(port, host, () => {
  console.log(`Rescue Gran Prix server listening on http://${host}:${port}`);
});
