// --- E2E-Tests (wie Djangos Selenium-Tests) ---
// Testen die App durch einen echten Browser (Chromium Headless).
// Django nutzt Selenium + Chrome Headless für die Admin-UI.
// Der Demonstrator nutzt Playwright.

import { expect, test } from "@playwright/test";

test.describe("Todo App E2E", () => {
  test.beforeEach(async ({ page, request }) => {
    // Alle Todos löschen (sauberer Zustand für jeden Test)
    const res = await request.get("/todos");
    const todos = await res.json();
    for (const todo of todos) {
      await request.delete(`/todos/${todo.id}`);
    }
    await page.goto("/");
  });

  test("shows app title", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("Todo API");
  });

  test("shows empty state initially", async ({ page }) => {
    await expect(page.locator(".empty-state")).toBeVisible();
  });

  test("creates a new todo", async ({ page }) => {
    await page.fill('input[placeholder="Neues Todo..."]', "E2E Test Todo");
    await page.selectOption("select", "high");
    await page.click('button[type="submit"]');

    await expect(page.locator(".todo-title")).toHaveText("E2E Test Todo");
    await expect(page.locator(".priority-high")).toBeVisible();
  });

  test("toggles todo completion", async ({ page }) => {
    await page.fill('input[placeholder="Neues Todo..."]', "Toggle Test");
    await page.click('button[type="submit"]');

    const item = page.locator(".todo-item").first();
    await expect(item).toBeVisible();

    // Toggle on
    await item.locator('input[type="checkbox"]').click();
    await expect(item).toHaveClass(/completed/);

    // Toggle off
    await item.locator('input[type="checkbox"]').click();
    await expect(item).not.toHaveClass(/completed/);
  });

  test("deletes a todo", async ({ page }) => {
    await page.fill('input[placeholder="Neues Todo..."]', "Delete Me");
    await page.click('button[type="submit"]');

    const item = page.locator(".todo-item").first();
    await expect(item).toBeVisible();

    await item.locator(".delete-btn").click();
    await expect(page.locator(".empty-state")).toBeVisible();
  });

  test("creates multiple todos", async ({ page }) => {
    await page.fill('input[placeholder="Neues Todo..."]', "First");
    await page.click('button[type="submit"]');

    await page.fill('input[placeholder="Neues Todo..."]', "Second");
    await page.click('button[type="submit"]');

    await expect(page.locator(".todo-item")).toHaveCount(2);
  });

  test("clears input after adding todo", async ({ page }) => {
    await page.fill('input[placeholder="Neues Todo..."]', "Clear Test");
    await page.click('button[type="submit"]');

    await expect(page.locator('input[placeholder="Neues Todo..."]')).toHaveValue("");
  });
});
