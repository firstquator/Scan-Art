import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const PASSWORD = "e2e-password";
const FIXTURE = path.join(__dirname, "fixtures", "artwork.jpg");

/** 브라우저 기본 대화상자(alert/confirm/prompt)가 뜨면 바로 실패시킨다. */
function forbidDialogs(page: Page) {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
    throw new Error(`브라우저 기본 대화상자가 떴어요: ${dialog.type()} "${dialog.message()}"`);
  });
}

/** 화면에 개발자용 영어 오류 문구가 보이면 실패시킨다. */
async function expectNoEnglishErrors(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\b(Error|undefined|null|Exception|failed|Unauthorized)\b/);
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("관리자 비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe.configure({ mode: "serial" });

let artworkUrl = "";

test("틀린 비밀번호는 한국어로 안내하고, 맞으면 들어간다", async ({ page }) => {
  forbidDialogs(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel("관리자 비밀번호").fill("틀린비밀번호");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "비밀번호가 맞지 않습니다" })).toBeVisible();
  await expectNoEnglishErrors(page);

  await page.getByLabel("관리자 비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByRole("heading", { name: /전시 작품/ })).toBeVisible();
});

test("빈 작품을 저장하면 한국어 입력 오류를 보여준다", async ({ page }) => {
  forbidDialogs(page);
  await login(page);
  await page.goto("/admin/artworks/new");
  await page.getByRole("button", { name: "등록하기" }).first().click();
  await expect(page.getByText("작품명을 입력해 주세요.").first()).toBeVisible();
  await expect(page.getByText("작가를 한 명 이상 입력해 주세요.")).toBeVisible();
  await expectNoEnglishErrors(page);
});

test("사진을 올려 작품을 등록하면 WebP로 저장되고 QR 주소가 생긴다", async ({ page }) => {
  forbidDialogs(page);
  await login(page);
  await page.goto("/admin/artworks/new");

  await page.locator('input[type="file"][multiple]').setInputFiles(FIXTURE);
  await expect(page.getByText("대표", { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("작품명").fill("바다를 닮은 하늘");
  const artists = page.getByRole("textbox", { name: "작가" });
  await artists.fill("김하늘, 박바다");
  await artists.press("Enter");
  await page.getByLabel(/^설명/).fill("파란 물감으로 하늘을 칠했어요. 구름은 휴지로 톡톡 찍었어요!");

  await page.getByRole("button", { name: "등록하기" }).first().click();
  await expect(page.getByText("작품을 등록했습니다.", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/artworks\/[a-z0-9]{8}$/);

  artworkUrl = new URL(page.url()).pathname.replace("/admin/artworks/", "/a/");

  const src = await page.locator("img[src*='-sm.webp']").first().getAttribute("src");
  expect(src).toMatch(/\.webp$/);
  const res = await page.request.get(src!);
  expect(res.headers()["content-type"]).toBe("image/webp");
});

test("관람객 화면: 휴대폰에서 작품 이야기와 작가가 보인다", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  forbidDialogs(page);
  await page.goto(artworkUrl);

  await expect(page.getByRole("heading", { level: 1, name: "바다를 닮은 하늘" })).toBeVisible();
  await expect(page.getByRole("list", { name: "작가" })).toContainText("김하늘");
  await expect(page.getByRole("list", { name: "작가" })).toContainText("박바다");
  await expect(page.getByText("구름은 휴지로 톡톡 찍었어요!")).toBeVisible();

  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noOverflow).toBe(true);

  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toContain("/opengraph-image");

  await page.getByRole("button", { name: "전체 화면으로 보기" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await context.close();
});

test("비공개로 바꾸면 QR 페이지는 '준비 중' 화면을 보여준다", async ({ page }) => {
  forbidDialogs(page);
  await login(page);
  await page.getByRole("switch", { name: "공개 중" }).first().click();
  await expect(page.getByText("비공개로 바꿨습니다", { exact: false })).toBeVisible();

  await page.goto(artworkUrl);
  await expect(page.getByRole("heading", { name: "작품 이야기를 준비하고 있습니다" })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("switch", { name: "준비 중" }).first().click();
  await expect(page.getByText("관람객에게 공개했습니다.")).toBeVisible();
});

test("기본 주소는 관리자 화면으로, 전시 표지는 /exhibition", async ({ page }) => {
  forbidDialogs(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin(\/login)?$/);
  await page.goto("/exhibition");
  await expect(page.getByRole("heading", { name: /전시 작품/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /바다를 닮은 하늘/ })).toBeVisible();
});

test("없는 작품 주소는 한국어 안내 화면을 보여준다", async ({ page }) => {
  forbidDialogs(page);
  const res = await page.goto("/a/zzzz2345");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "지금은 볼 수 없는 작품입니다" })).toBeVisible();
  await expectNoEnglishErrors(page);
});

test("삭제는 디자인된 확인 모달을 거친다", async ({ page }) => {
  forbidDialogs(page);
  await login(page);
  await page.getByRole("button", { name: "바다를 닮은 하늘 삭제" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("삭제하시겠습니까?");
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "바다를 닮은 하늘" })).toBeVisible();
});

test("인쇄 화면: 명제표가 A4 위에 실제 크기로 배치된다", async ({ page }) => {
  forbidDialogs(page);
  await login(page);
  await page.goto("/admin/print");
  await expect(page.getByText(/A4 한 장에 10개씩/)).toBeVisible();

  await page.emulateMedia({ media: "print" });
  const size = await page.evaluate(() => {
    const sheet = document.querySelector(".print-sheets .sheet") as HTMLElement;
    const card = sheet.firstElementChild as HTMLElement;
    const mm = sheet.getBoundingClientRect().width / 210;
    return { w: card.getBoundingClientRect().width / mm, h: card.getBoundingClientRect().height / mm };
  });
  expect(size.w).toBeCloseTo(90, 0);
  expect(size.h).toBeCloseTo(50, 0);
});
