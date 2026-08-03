import { expect, test } from "@playwright/test";

test("exibe o login sem rolagem horizontal", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByText("Obradocs", { exact: true })).toBeVisible();
  await expect(page.getByText("Acessar sua conta")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Senha", exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("alterna entre login e cadastro", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("Criar sua conta")).toBeVisible();
  await expect(page.getByLabel("Nome")).toBeVisible();
  await expect(page.getByRole("checkbox")).toBeVisible();
});
