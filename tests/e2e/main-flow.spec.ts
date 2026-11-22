import { type Browser, expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Fluxo principal (SPEC §11, Fase 7):
 * login lucas → reservar Kwid → pagar → (como ana) aceitar → (como lucas) vistoria → iniciar.
 * Entre a vistoria e o início, a Ana confere o código de retirada (exigência do ciclo da §6).
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // variáveis já vêm do ambiente (CI)
}

const PASSWORD = process.env.SEED_PASSWORD ?? "";
const KWID_ID = "c0000000-0000-4000-8000-000000000003";

// PNG 10×10 para as fotos de vistoria
const PHOTO = {
  name: "vistoria.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
    "base64",
  ),
};

async function login(browser: Browser, who: "lucas" | "ana"): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(`${who}@rumo.test`);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/explore");
  return page;
}

test.beforeAll(async () => {
  expect(PASSWORD, "defina SEED_PASSWORD no .env.local").not.toBe("");
  // Deixa o teste repetível: libera as datas do Kwid ocupadas por execuções anteriores.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin
    .from("bookings")
    .delete()
    .eq("car_id", KWID_ID)
    .in("status", ["requested", "accepted", "active"]);
  expect(error).toBeNull();
});

test("locatário reserva e paga, dona aceita, vistoria e início do aluguel", async ({ browser }) => {
  // ── Lucas: explorar → Kwid → reservar ──
  const lucas = await login(browser, "lucas");
  await expect(lucas.getByTestId("car-card").first()).toBeVisible();
  await lucas.getByRole("link", { name: /Renault Kwid/ }).click();
  await expect(lucas.getByRole("heading", { name: "Renault Kwid 2023" })).toBeVisible();
  await expect(lucas.getByText("Ana Paula Ribeiro")).toBeVisible();
  await lucas.getByRole("link", { name: "Reservar" }).click();
  await lucas.waitForURL("**/book");

  // 3 diárias: 1º dia livre + 2 → 3 × R$ 89 = 267 + taxa 27 = R$ 294
  const freeDays = lucas.locator(".days button:not([disabled])");
  await freeDays.nth(0).click();
  await freeDays.nth(2).click();
  await expect(lucas.getByTestId("total")).toHaveText("R$ 294");
  await lucas.getByRole("button", { name: /Confirmar e pagar R\$ 294/ }).click();

  // ── Pix simulado ──
  await lucas.waitForURL("**/bookings/new/pay**");
  await expect(lucas.getByAltText("QR code do Pix (simulado)")).toBeVisible();
  await expect(lucas.getByTestId("countdown")).toHaveText(/^(10:00|09:5\d)$/);
  await lucas.getByRole("button", { name: "Simular pagamento" }).click();
  await lucas.waitForURL(/\/bookings\/[0-9a-f-]{36}\/pay$/);
  await expect(lucas.getByRole("heading", { name: "Pagamento confirmado!" })).toBeVisible();
  const bookingId = lucas.url().match(/bookings\/([0-9a-f-]{36})/)![1];

  await lucas.getByRole("link", { name: "Ver meu aluguel" }).click();
  await lucas.waitForURL(`**/rentals/${bookingId}`);
  await expect(lucas.getByText("Aguardando Ana aceitar")).toBeVisible();

  // ── Ana: aceitar o pedido ──
  const ana = await login(browser, "ana");
  await ana.goto(`/earn?car=${KWID_ID}`);
  const request = ana.getByTestId("request").filter({ hasText: "Lucas Yokoyama" });
  await expect(request).toBeVisible();
  await request.getByRole("button", { name: "Aceitar" }).click();
  await expect(ana.getByText("Reservas em andamento")).toBeVisible();

  // ── Lucas: código de retirada + vistoria de 4 fotos ──
  await lucas.reload();
  const code = (await lucas.getByTestId("pickup-code").innerText()).trim();
  expect(code).toMatch(/^\d{4}$/);
  const start = lucas.getByRole("button", { name: "Iniciar aluguel" });
  await expect(start).toBeDisabled();
  for (const angle of ["front", "back", "left", "right"]) {
    await lucas.locator(`label[data-angle=${angle}] input`).setInputFiles(PHOTO);
    await expect(lucas.locator(`label[data-angle=${angle}]`)).toHaveAttribute("data-ok", "true");
  }
  await expect(lucas.getByText("Vistoria completa.")).toBeVisible();
  await expect(start).toBeDisabled(); // ainda falta a dona conferir o código

  // ── Ana: confere o código na entrega das chaves ──
  await ana.goto(`/earn/bookings/${bookingId}`);
  await ana.getByLabel("Código de retirada").fill(code);
  await ana.getByRole("button", { name: "Confirmar código" }).click();
  await expect(ana.getByText(/Código confirmado em/)).toBeVisible();

  // ── Lucas: iniciar ──
  await lucas.reload();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(lucas.getByText(/Aluguel em andamento/)).toBeVisible();
  await lucas.goto("/rentals?tab=active");
  await expect(lucas.getByTestId("rental").filter({ hasText: "Renault Kwid 2023" })).toBeVisible();
});
