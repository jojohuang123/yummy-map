import { AppError, isAppError } from "./errors.js";

export const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
  });
  response.end(JSON.stringify(payload));
};

export const parseBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "请求体不是有效 JSON");
  }
};

export const parseMultipartForm = async (request) => {
  const contentType = String(request.headers["content-type"] || "");
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new AppError(400, "INVALID_MULTIPART", "缺少 multipart boundary");
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBuffer = Buffer.concat(chunks);
  const boundary = `--${boundaryMatch[1]}`;
  const rawText = rawBuffer.toString("latin1");
  const parts = rawText.split(boundary).slice(1, -1);
  const fields = {};
  const files = [];

  for (const rawPart of parts) {
    const trimmedPart = rawPart.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const separatorIndex = trimmedPart.indexOf("\r\n\r\n");
    if (separatorIndex < 0) continue;

    const headerText = trimmedPart.slice(0, separatorIndex);
    const bodyText = trimmedPart.slice(separatorIndex + 4);
    const headers = Object.fromEntries(
      headerText.split("\r\n").map((line) => {
        const divider = line.indexOf(":");
        return [line.slice(0, divider).trim().toLowerCase(), line.slice(divider + 1).trim()];
      })
    );

    const disposition = headers["content-disposition"] || "";
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    const fileNameMatch = disposition.match(/filename="([^"]*)"/i);
    if (fileNameMatch) {
      files.push({
        fieldName,
        filename: fileNameMatch[1],
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: Buffer.from(bodyText, "latin1")
      });
      continue;
    }

    fields[fieldName] = bodyText;
  }

  return {
    fields,
    files
  };
};

export const sendError = (response, error) => {
  if (isAppError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message
    });
    return;
  }

  console.error(error);
  sendJson(response, 500, {
    code: "INTERNAL_SERVER_ERROR",
    message: "服务内部错误"
  });
};
