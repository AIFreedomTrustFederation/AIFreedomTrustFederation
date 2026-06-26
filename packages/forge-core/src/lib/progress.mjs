import { spawn } from "node:child_process";

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }

  return `${secs}s`;
}

export async function runWithProgress(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    label = command,
    heartbeatMs = 5000,
    quiet = false
  } = options;

  const startedAt = Date.now();

  console.log(`▶ ${label}`);
  console.log(`  cwd: ${cwd}`);
  console.log(`  cmd: ${command} ${args.join(" ")}`);

  return await new Promise((resolve) => {
    let lastOutputAt = Date.now();
    let heartbeatCount = 0;

    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: process.env
    });

    const heartbeat = setInterval(() => {
      const now = Date.now();
      const elapsed = formatElapsed(now - startedAt);
      const quietFor = formatElapsed(now - lastOutputAt);
      heartbeatCount += 1;

      console.log(`⏳ ${label} still running... elapsed ${elapsed}, quiet ${quietFor}`);
    }, heartbeatMs);

    child.stdout.on("data", (chunk) => {
      lastOutputAt = Date.now();
      const text = chunk.toString();
      if (!quiet) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      lastOutputAt = Date.now();
      const text = chunk.toString();
      if (!quiet) {
        process.stderr.write(text);
      }
    });

    child.on("error", (error) => {
      clearInterval(heartbeat);
      console.log(`❌ ${label} failed to start: ${error.message}`);
      resolve({
        ok: false,
        code: 1,
        error,
        elapsedMs: Date.now() - startedAt,
        heartbeatCount
      });
    });

    child.on("close", (code) => {
      clearInterval(heartbeat);

      const elapsedMs = Date.now() - startedAt;
      const elapsed = formatElapsed(elapsedMs);

      if (code === 0) {
        console.log(`✅ ${label} finished in ${elapsed}`);
      } else {
        console.log(`❌ ${label} failed with exit code ${code} after ${elapsed}`);
      }

      resolve({
        ok: code === 0,
        code,
        elapsedMs,
        heartbeatCount
      });
    });
  });
}
