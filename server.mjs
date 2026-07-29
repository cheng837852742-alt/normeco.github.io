import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const adminCatalogPath = resolve(root, "data/admin-catalog.json");
const uploadDirectory = resolve(root, "assets/product-catalog/uploads");
const sessionCookieName = "normeco_admin_session";
const adminUser = process.env.NORMECO_ADMIN_USER || "admin";
const adminPassword = process.env.NORMECO_ADMIN_PASSWORD || "normeco888";
const sessions = new Set();

const types = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".step": "application/step",
  ".stp": "application/step",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function secretMatches(value, expected) {
  const left = createHash("sha256").update(String(value)).digest();
  const right = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").map((item) => {
    const separator = item.indexOf("=");
    return separator < 0
      ? ["", ""]
      : [item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1).trim())];
  }).filter(([name]) => name));
}

function isAuthenticated(request) {
  const token = parseCookies(request)[sessionCookieName];
  return Boolean(token && sessions.has(token));
}

function requireAuthentication(request, response) {
  if (isAuthenticated(request)) return true;
  sendJson(response, 401, { error: "请先登录后台。" });
  return false;
}

function readBody(request, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let finished = false;
    request.on("data", (chunk) => {
      if (finished) return;
      size += chunk.length;
      if (size > maxBytes) {
        finished = true;
        rejectBody(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!finished) resolveBody(Buffer.concat(chunks));
    });
    request.on("error", rejectBody);
  });
}

async function readJsonBody(request, maxBytes) {
  const body = await readBody(request, maxBytes);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 });
  }
}

async function readAdminCatalog() {
  return JSON.parse(await readFile(adminCatalogPath, "utf8"));
}

function isValidCatalog(catalog) {
  return catalog
    && Array.isArray(catalog.products)
    && Array.isArray(catalog.categories)
    && Array.isArray(catalog.tags)
    && Array.isArray(catalog.customCases)
    && catalog.products.every((product) => product && typeof product.id === "string" && typeof product.name === "string")
    && catalog.customCases.every((item) => item
      && typeof item.id === "string"
      && typeof item.image === "string"
      && item.zh && typeof item.zh.title === "string"
      && item.en && typeof item.en.title === "string");
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    const credentials = await readJsonBody(request, 32 * 1024);
    if (!secretMatches(credentials.username || "", adminUser)
      || !secretMatches(credentials.password || "", adminPassword)) {
      sendJson(response, 401, { error: "账户或密码不正确。" });
      return true;
    }
    const token = randomBytes(32).toString("hex");
    sessions.add(token);
    sendJson(response, 200, { ok: true }, {
      "set-cookie": `${sessionCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`
    });
    return true;
  }

  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    const token = parseCookies(request)[sessionCookieName];
    if (token) sessions.delete(token);
    sendJson(response, 200, { ok: true }, {
      "set-cookie": `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
    });
    return true;
  }

  if (url.pathname === "/api/admin/session" && request.method === "GET") {
    sendJson(response, 200, { authenticated: isAuthenticated(request) });
    return true;
  }

  if (url.pathname === "/api/admin/catalog" && request.method === "GET") {
    if (!requireAuthentication(request, response)) return true;
    sendJson(response, 200, await readAdminCatalog());
    return true;
  }

  if (url.pathname === "/api/admin/catalog" && request.method === "PUT") {
    if (!requireAuthentication(request, response)) return true;
    const catalog = await readJsonBody(request, 25 * 1024 * 1024);
    if (!isValidCatalog(catalog)) {
      sendJson(response, 400, { error: "目录数据格式不正确。" });
      return true;
    }
    catalog.updatedAt = new Date().toISOString();
    await writeFile(adminCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    sendJson(response, 200, { ok: true, updatedAt: catalog.updatedAt });
    return true;
  }

  if (url.pathname === "/api/admin/image" && request.method === "POST") {
    if (!requireAuthentication(request, response)) return true;
    const mediaType = String(request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const extensions = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };
    const extension = extensions[mediaType];
    if (!extension) {
      sendJson(response, 415, { error: "仅支持 JPG、PNG 或 WebP 图片。" });
      return true;
    }
    const image = await readBody(request, 5 * 1024 * 1024);
    if (!image.length) {
      sendJson(response, 400, { error: "图片文件为空。" });
      return true;
    }
    await mkdir(uploadDirectory, { recursive: true });
    const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
    await writeFile(resolve(uploadDirectory, fileName), image);
    sendJson(response, 201, { path: `assets/product-catalog/uploads/${fileName}` });
    return true;
  }

  if (url.pathname === "/api/catalog" && request.method === "GET") {
    const catalog = await readAdminCatalog();
    sendJson(response, 200, {
      version: catalog.version,
      updatedAt: catalog.updatedAt,
      categories: catalog.categories,
      tags: catalog.tags,
      products: catalog.products.filter((product) => product.status === "已发布"),
      customCases: catalog.customCases.filter((item) => item.status === "已发布")
    });
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      if (!await handleApi(request, response, url)) {
        sendJson(response, 404, { error: "接口不存在。" });
      }
      return;
    }

    const encodedPathname = url.pathname === "/" ? "/index.html" : url.pathname;
    let pathname;
    try {
      pathname = decodeURIComponent(encodedPathname);
    } catch {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Bad request");
      return;
    }
    if (pathname === "/data" || pathname.startsWith("/data/")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const filePath = normalize(join(root, pathname));
    const relativePath = relative(root, filePath);

    if (relativePath.startsWith("..") || isAbsolute(relativePath) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": types[extname(filePath).toLowerCase()] || "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error(error);
    if (!response.headersSent) sendJson(response, status, { error: status === 500 ? "服务器处理失败。" : error.message });
    else response.end();
  }
}).listen(port, host, () => {
  console.log(`Local site running at http://${host}:${port}/`);
});
