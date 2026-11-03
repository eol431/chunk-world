// 청크월드 서버: 정적 파일 + WebSocket 릴레이 (BroadcastChannel 대체)
const http = require("http");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const MAX_CLIENTS = 40;
const MAX_EDITS_PER_SEED = 60000;

const raw = fs.readFileSync(path.join(__dirname, "public", "index.html"));
const gz = zlib.gzipSync(raw, { level: 9 });

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("ok"); }
  if (url === "/" || url === "/index.html") {
    const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", Vary: "Accept-Encoding" };
    if (/\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      headers["Content-Encoding"] = "gzip";
      res.writeHead(200, headers);
      return res.end(gz);
    }
    res.writeHead(200, headers);
    return res.end(raw);
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 4096 });
const clients = new Set();
const edits = new Map(); // seed -> Map("x,y,z" -> blockId)  (서버가 켜져 있는 동안 유지)

function relay(from, str) {
  for (const c of clients) if (c !== from && c.readyState === 1) c.send(str);
}

wss.on("connection", (ws) => {
  if (clients.size >= MAX_CLIENTS) { ws.close(1013, "full"); return; }
  clients.add(ws);
  ws.alive = true; ws.tokens = 120; ws.pid = null; ws.seedSent = null;

  ws.on("pong", () => { ws.alive = true; });
  ws.on("message", (data) => {
    if (ws.tokens <= 0) return;
    ws.tokens--;
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }
    if (!m || typeof m !== "object" || typeof m.t !== "string") return;
    if (typeof m.id === "string") ws.pid = m.id.slice(0, 8);
    const seed = typeof m.seed === "string" ? m.seed.slice(0, 64) : "";

    if (m.t === "b") {
      const x = m.x | 0, y = m.y | 0, z = m.z | 0, b = m.b | 0;
      let map = edits.get(seed);
      if (!map) { map = new Map(); edits.set(seed, map); }
      if (map.size < MAX_EDITS_PER_SEED || map.has(x + "," + y + "," + z)) map.set(x + "," + y + "," + z, b);
    }
    // 같은 월드(seed)에 처음 들어온 사람에게 지금까지의 블록 변경을 보내 줌
    if (m.t === "p" && ws.seedSent !== seed) {
      ws.seedSent = seed;
      const map = edits.get(seed);
      if (map) {
        for (const [k, b] of map) {
          const [x, y, z] = k.split(",").map(Number);
          if (ws.readyState === 1) ws.send(JSON.stringify({ t: "b", x, y, z, b, id: "srv", seed }));
        }
      }
    }
    relay(ws, data.toString());
  });
  ws.on("close", () => {
    clients.delete(ws);
    if (ws.pid) relay(ws, JSON.stringify({ t: "bye", id: ws.pid }));
  });
  ws.on("error", () => {});
});

setInterval(() => { for (const c of clients) c.tokens = 120; }, 1000);
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { c.terminate(); continue; }
    c.alive = false;
    try { c.ping(); } catch {}
  }
}, 25000);

server.listen(PORT, "0.0.0.0", () => console.log("ChunkWorld server on :" + PORT));
