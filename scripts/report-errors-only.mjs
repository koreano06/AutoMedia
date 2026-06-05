import { spawnSync } from "node:child_process";

const checks = [
  { label: "Frontend TypeScript", command: "npm run typecheck" },
  { label: "Frontend ESLint", command: "npm run lint" },
  { label: "Frontend Unit Tests", command: "npm test" },
  { label: "Frontend Build", command: "npm run build" },
  ...(process.env.SKIP_E2E === "true" ? [] : [{ label: "Frontend E2E", command: "npm run test:e2e" }]),
];

const failures = [];

for (const check of checks) {
  const result = spawnSync(check.command, {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  });

  if (result.status !== 0) {
    failures.push({
      ...check,
      status: result.status,
      stdout: result.stdout?.trim(),
      stderr: result.stderr?.trim(),
    });
  }
}

if (failures.length > 0) {
  console.error("RELATORIO DE ERROS - FRONTEND");

  for (const failure of failures) {
    console.error(`\n[${failure.label}]`);
    console.error(`Comando: ${failure.command}`);
    console.error(`Exit code: ${failure.status}`);

    if (failure.stdout) {
      console.error("\nSTDOUT:");
      console.error(failure.stdout);
    }

    if (failure.stderr) {
      console.error("\nSTDERR:");
      console.error(failure.stderr);
    }
  }

  process.exit(1);
}

