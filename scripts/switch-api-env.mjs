import { writeFile } from "node:fs/promises";

const [, , target, customUrl] = process.argv;

const presets = {
  local: "http://localhost:3333/api",
  vm: "http://192.168.1.42:3333/api",
  vercel: "https://auto-media-backend.vercel.app/api",
};

function normalizeUrl(value) {
  return value.replace(/\/+$/, "");
}

function resolveApiUrl() {
  if (target === "tunnel" || target === "custom" || target === "public") {
    if (!customUrl) {
      throw new Error(`Informe a URL da API. Exemplo: npm run api:${target} -- https://api.seudominio.com`);
    }

    const baseUrl = normalizeUrl(customUrl);
    return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
  }

  if (!target || !presets[target]) {
    throw new Error("Uso: node scripts/switch-api-env.mjs local|vm|vercel|tunnel|custom|public [url]");
  }

  return presets[target];
}

const apiUrl = resolveApiUrl();

await writeFile(".env.local", `VITE_API_BASE_URL=${apiUrl}\n`);

console.log(`.env.local atualizado:`);
console.log(`VITE_API_BASE_URL=${apiUrl}`);
console.log("");
console.log("Reinicie o Vite para aplicar a troca: npm run dev");

