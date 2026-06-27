import http from "node:http";
import https from "node:https";

export function requestJson(url, options = {}) {
  const {
    method = "GET",
    body = undefined,
    timeoutMs = 60000,
    headers = {}
  } = options;

  return new Promise((resolve) => {
    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, error: "invalid url" });
      return;
    }

    const transport = parsed.protocol === "https:" ? https : http;
    const data = body === undefined ? undefined : JSON.stringify(body);

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        timeout: timeoutMs,
        headers: {
          accept: "application/json",
          ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}),
          ...headers
        }
      },
      (res) => {
        let raw = "";

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          let parsedBody = raw;

          try {
            parsedBody = raw ? JSON.parse(raw) : null;
          } catch {
            parsedBody = raw;
          }

          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: parsedBody
          });
        });
      }
    );

    req.on("error", (error) => {
      resolve({ ok: false, error: error.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });

    if (data) req.write(data);
    req.end();
  });
}
