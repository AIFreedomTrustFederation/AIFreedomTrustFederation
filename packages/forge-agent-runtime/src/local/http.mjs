import http from "node:http";

export function localJsonPost(url, body, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120000;

  return new Promise((resolve) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);

    const request = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode,
              json: JSON.parse(data)
            });
          } catch {
            resolve({
              ok: false,
              status: response.statusCode,
              text: data
            });
          }
        });
      }
    );

    request.on("error", (error) => {
      resolve({
        ok: false,
        error: error.message
      });
    });

    request.on("timeout", () => {
      request.destroy();
      resolve({
        ok: false,
        error: "local request timed out"
      });
    });

    request.write(payload);
    request.end();
  });
}
