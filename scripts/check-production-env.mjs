import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [".env.local", ".env.production", ".env"];

function readEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return {};

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...parts] = line.split("=");
        return [key.trim(), parts.join("=").trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

const fileEnv = envFiles.reduce((current, fileName) => ({ ...current, ...readEnvFile(fileName) }), {});
const env = { ...fileEnv, ...process.env };

const required = ["VITE_API_BASE_URL"];
const missing = required.filter((key) => !env[key]);
const warnings = [];

if (env.VITE_API_BASE_URL) {
  try {
    const apiUrl = new URL(env.VITE_API_BASE_URL);
    if (apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1") {
      warnings.push("VITE_API_BASE_URL aponta para ambiente local.");
    }
  } catch {
    missing.push("VITE_API_BASE_URL precisa ser uma URL valida.");
  }
}

if (!env.VITE_APP_BASE_URL) {
  warnings.push("VITE_APP_BASE_URL nao foi configurada. Use a URL publica do frontend em producao.");
}

if (missing.length > 0) {
  console.error("Falha na checagem de producao do frontend:");
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Checklist de producao do frontend aprovado.");
warnings.forEach((item) => console.warn(`Aviso: ${item}`));
