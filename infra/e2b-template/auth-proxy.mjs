import http from "node:http";
import crypto from "node:crypto";
import httpProxy from "http-proxy";

const SECRET = process.env.AUTH_PROXY_SECRET;
if (!SECRET) {
  console.error("AUTH_PROXY_SECRET not set");
  process.exit(1);
}

const PORT = Number(process.env.AUTH_PROXY_PORT ?? 13338);
const TARGET_PORT = Number(process.env.AUTH_PROXY_UPSTREAM_PORT ?? 13337);
const COOKIE_NAME = "leopard_workspace_auth";

function verify(token) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("hex");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    );
    return (
      typeof payload.exp === "number" &&
      payload.exp >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function getCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return null;
}

function checkAuth(req) {
  const url = new URL(req.url, "http://placeholder");
  const queryToken = url.searchParams.get("token");
  if (queryToken && verify(queryToken)) {
    return { ok: true, token: queryToken, fromQuery: true };
  }
  const cookieToken = getCookie(req.headers.cookie, COOKIE_NAME);
  if (cookieToken && verify(cookieToken)) {
    return { ok: true, token: cookieToken, fromQuery: false };
  }
  return { ok: false };
}

const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${TARGET_PORT}`,
  ws: true,
  xfwd: true,
});

proxy.on("error", (err, _req, res) => {
  if (res && typeof res.writeHead === "function") {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`Bad gateway: ${err.message}`);
  }
});

const server = http.createServer((req, res) => {
  const auth = checkAuth(req);
  if (!auth.ok) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Unauthorized");
    return;
  }

  if (auth.fromQuery) {
    const url = new URL(req.url, "http://placeholder");
    url.searchParams.delete("token");
    const redirectPath = url.pathname + (url.search ? url.search : "");
    res.writeHead(302, {
      Location: redirectPath,
      "Set-Cookie": `${COOKIE_NAME}=${auth.token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    });
    res.end();
    return;
  }

  proxy.web(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const auth = checkAuth(req);
  if (!auth.ok) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  proxy.ws(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`auth-proxy listening on :${PORT} -> 127.0.0.1:${TARGET_PORT}`);
});
