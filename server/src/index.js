import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { parseBody, parseMultipartForm, sendError, sendJson } from "./lib/http.js";
import { getDb } from "./lib/db.js";
import {
  confirmImport,
  createImport,
  getFavoriteList,
  getImportById,
  removeFavorite,
  removeFavorites,
  updateImportSelections
} from "./services/import-service.js";
import { getPaddleOcrStatus, warmupPaddleOcr } from "./services/paddle-ocr-service.js";
import { saveUpload } from "./services/upload-service.js";

const sendHtml = (response, statusCode, html) => {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
  });
  response.end(html);
};

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      sendJson(response, 404, { message: "Not Found" });
      return;
    }

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url, `http://127.0.0.1:${config.port}`);

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(
        response,
        200,
        `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Yummy Map API</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f6f1e8; color: #1f1a17; padding: 24px; line-height: 1.6; }
      .card { max-width: 720px; background: #fffaf5; border: 1px solid #dccdbd; border-radius: 16px; padding: 24px; box-shadow: 0 12px 24px rgba(85, 61, 39, 0.06); }
      code { background: #efe2d0; padding: 2px 6px; border-radius: 6px; }
      ul { padding-left: 20px; }
      a { color: #65452b; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Yummy Map API 已启动</h1>
      <p>这里是本地后端接口，不是浏览器网页首页。</p>
      <ul>
        <li>健康检查：<a href="/health">/health</a></li>
        <li>收藏地图接口：<code>/api/favorites/map</code></li>
        <li>导入接口：<code>POST /api/imports</code></li>
      </ul>
      <p>前端请在微信开发者工具中打开项目目录 <code>/Users/lotterian/Desktop/yummy map</code>。</p>
      <p>如果你要真机调试，请把小程序里的 API 地址切到电脑局域网 IP，而不是 <code>127.0.0.1</code>。</p>
    </div>
  </body>
</html>`
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        services: {
          amap: Boolean(config.amapWebApiKey),
          ocr: getPaddleOcrStatus()
        }
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/imports") {
      const body = await parseBody(request);
      const preview = await createImport(body);
      sendJson(response, 200, {
        importId: preview.id,
        status: preview.status,
        preview
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      const multipart = await parseMultipartForm(request);
      const file = multipart.files[0];
      if (!file) {
        sendJson(response, 400, {
          code: "UPLOAD_FILE_REQUIRED",
          message: "请上传图片文件"
        });
        return;
      }

      const upload = await saveUpload({
        filename: file.filename,
        contentType: file.contentType,
        buffer: file.buffer
      });
      sendJson(response, 200, {
        uploadId: upload.id,
        filename: upload.filename,
        size: upload.size
      });
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/imports/")) {
      const importId = url.pathname.split("/").pop();
      sendJson(response, 200, await getImportById(importId));
      return;
    }

    if (request.method === "PATCH" && /^\/api\/imports\/[^/]+\/items$/.test(url.pathname)) {
      const importId = url.pathname.split("/")[3];
      const body = await parseBody(request);
      const preview = await updateImportSelections(importId, body.selectedItemIds || []);
      sendJson(response, 200, preview);
      return;
    }

    if (request.method === "POST" && /^\/api\/imports\/[^/]+\/confirm$/.test(url.pathname)) {
      const importId = url.pathname.split("/")[3];
      sendJson(response, 200, await confirmImport(importId));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/favorites") {
      const items = await getFavoriteList();
      sendJson(response, 200, {
        total: items.length,
        items
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/favorites/map") {
      const items = await getFavoriteList();
      sendJson(response, 200, {
        total: items.length,
        items
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/favorites/batch-delete") {
      const body = await parseBody(request);
      sendJson(response, 200, await removeFavorites(body.favoriteIds || []));
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/favorites/")) {
      const favoriteId = url.pathname.split("/").pop();
      sendJson(response, 200, await removeFavorite(favoriteId));
      return;
    }

    sendJson(response, 404, { message: "Not Found" });
  } catch (error) {
    sendError(response, error);
  }
});

const startup = async () => {
  await getDb();
  console.log("SQLite database initialized");

  server.listen(config.port, () => {
    console.log(`yummy-map server listening on http://127.0.0.1:${config.port}`);
    warmupPaddleOcr();
  });
};

startup();
