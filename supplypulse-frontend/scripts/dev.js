const { spawn } = require("child_process");

const child = spawn("next", ["dev", "--port", "3000"], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
