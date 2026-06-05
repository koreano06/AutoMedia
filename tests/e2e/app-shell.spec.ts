import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

async function loginAsAdmin(page: Page) {
  const loginForm = page.locator("form").filter({ has: page.locator("#login-username") });

  await expect(loginForm).toContainText("admin / admin123");
  await loginForm.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page.getByText("Dashboard").first()).toBeVisible();
}

test("logs in and opens the main app shell", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "AutoMedia" })).toBeVisible();

  await loginAsAdmin(page);

  await expect(page.getByText("Dashboard").first()).toBeVisible();
  await expect(page.getByText("AutoMedia").first()).toBeVisible();
});

test("navigates through key sections", async ({ page }) => {
  await loginAsAdmin(page);

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
