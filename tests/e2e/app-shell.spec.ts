import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

const API_TOKEN_STORAGE_KEY = "automedia_api_token";
const API_REFRESH_TOKEN_STORAGE_KEY = "automedia_api_refresh_token";
let cachedAuth: { token: string; refreshToken: string } | null = null;

function getApiBaseUrl() {
  if (process.env.E2E_API_BASE_URL) return process.env.E2E_API_BASE_URL.replace(/\/+$/, "");
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL.replace(/\/+$/, "");

  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    const match = envContent.match(/^VITE_API_BASE_URL=(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m);
    const value = match?.[1] || match?.[2] || match?.[3];
    if (value) return value.trim().replace(/\/+$/, "");
  }

  return "http://192.168.1.42:3333/api";
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

async function loginAsAdmin(page: Page) {
  const loginForm = page.locator("form").filter({ has: page.locator("#login-username") });

  await expect(loginForm).toContainText("admin / admin123");
  await loginForm.locator("#login-username").fill("admin");
  await loginForm.locator("#login-password").fill("admin123");
  await loginForm.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page.getByText("Entrar no painel")).toBeHidden();
  await expect(page.locator("body")).toContainText(/Dashboard|Administrador/);
}

async function authenticateViaApi(page: Page, request: APIRequestContext) {
  if (!cachedAuth) {
    const response = await request.post(`${getApiBaseUrl()}/auth/login`, {
      data: { username: "admin", password: "admin123" },
    });

    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    cachedAuth = { token: payload.token, refreshToken: payload.refresh_token };
  }

  await page.evaluate(
    ({ token, refreshToken, tokenKey, refreshTokenKey }) => {
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(refreshTokenKey, refreshToken);
    },
    {
      token: cachedAuth.token,
      refreshToken: cachedAuth.refreshToken,
      tokenKey: API_TOKEN_STORAGE_KEY,
      refreshTokenKey: API_REFRESH_TOKEN_STORAGE_KEY,
    },
  );

  await page.goto("/");
  await expect(page.locator("body")).toContainText(/Dashboard|Administrador/);
}

test("logs in and opens the main app shell", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "AutoMedia" })).toBeVisible();

  await loginAsAdmin(page);

  await expect(page.getByText("Dashboard").first()).toBeVisible();
  await expect(page.getByText("AutoMedia").first()).toBeVisible();
});

test("navigates through key sections", async ({ page, request }) => {
  await authenticateViaApi(page, request);

  await page.goto("/products");
  await expect(page.getByText("Anúncios Base").first()).toBeVisible();

  await page.goto("/media");
  await expect(page.getByText("Biblioteca de Mídia").first()).toBeVisible();

  await page.goto("/schedule");
  await expect(page.getByText("Agendamento").first()).toBeVisible();

  await page.goto("/quality");
  await expect(page.getByText("Qualidade").first()).toBeVisible();
  await expect(page.getByText("Central de qualidade")).toBeVisible();
});

test("opens the media import flow for product reference images", async ({ page, request }) => {
  await authenticateViaApi(page, request);

  await page.goto("/media");
  await expect(page.getByText("Biblioteca de Mídia").first()).toBeVisible();

  await page.getByRole("button", { name: /Importar mídia/i }).first().click();

  await expect(page.getByRole("heading", { name: "Adicionar imagem à biblioteca" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Imagem local/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Imagem por URL/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Salvar na biblioteca|Salvar imagem/i })).toBeVisible();
});

test("shows the video creation storyboard and scene editor", async ({ page, request }) => {
  await authenticateViaApi(page, request);

  await page.goto("/videos");

  await expect(page.getByText("Geração de Vídeos").first()).toBeVisible();
  await expect(page.getByText("Prévia do roteiro")).toBeVisible();
  await expect(page.getByText("Editor de roteiro por cenas")).toBeVisible();
  await expect(page.getByText("Cena 1", { exact: true }).first()).toBeVisible();
});

test("opens approval workspace for reviewing generated creative", async ({ page, request }) => {
  await authenticateViaApi(page, request);

  await page.goto("/approval");

  await expect(page.getByText("Aprovação").first()).toBeVisible();
  await expect(page.getByText(/aprova|revis/i).first()).toBeVisible();
});
