const { spawn, execSync } = require("child_process");
const net = require("net");

const PORT = 3000;

// On Windows, `netlify dev` (or a hard Ctrl+C) can leave the spawned `next dev`
// child orphaned and still bound to port 3000. The next run then fails with
// EADDRINUSE. Detect and kill the stale listener before spawning a new one.
function freePort(port) {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (!out) return;
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
        console.log(`[dev] freed port ${port} (killed orphan PID ${pid})`);
      } catch {
        // ignore — process may have already exited
      }
    }
  } catch {
    // netstat printed nothing — port is free
  }
}

function waitForPortFree(port, attempts = 10) {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const s = net.createServer();
      s.once("error", () => {
        if (++n >= attempts) return resolve(false);
        setTimeout(tick, 150);
      });
      s.once("listening", () => s.close(() => resolve(true)));
      s.listen(port, "0.0.0.0");
    };
    tick();
  });
}

(async () => {
  freePort(PORT);
  await waitForPortFree(PORT);

  const child = spawn("next", ["dev", "--port", String(PORT)], {
    stdio: "inherit",
    shell: true,
  });

  // Make sure the Next.js child dies with us, even on Ctrl+C / parent kill.
  const killChild = () => {
    if (child.pid && !child.killed) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /PID ${child.pid} /F /T`, { stdio: "ignore" });
        } catch {
          // already gone
        }
      } else {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          // already gone
        }
      }
    }
  };

  process.on("SIGINT", () => {
    killChild();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    killChild();
    process.exit(143);
  });
  process.on("exit", killChild);

  child.on("exit", (code) => process.exit(code ?? 0));
})();
