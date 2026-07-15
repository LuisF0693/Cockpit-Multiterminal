import { chromium, type Browser, type Page } from 'playwright';

/**
 * BrowserPreviewManager (Épico 10, FR28/FR29) — gerencia UM `Browser`
 * Chromium (Playwright) compartilhado + uma `Page` por tile. Confinado ao
 * Main (nunca importado por core/shared — mesmo isolamento de provider do
 * NFR7/NFR9). Falha de automação NUNCA derruba o preview/app (AC4 da 10.2)
 * — todo método engole erro e degrada graciosamente (null/no-op).
 */
export class BrowserPreviewManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private readonly pages = new Map<string, Page>();

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (!this.launching) {
      this.launching = chromium.launch({ headless: true }).then((b) => {
        this.browser = b;
        return b;
      });
    }
    return this.launching;
  }

  /** Cria a página se ainda não existir (idempotente — cobre o restore pós-boot, AC3). */
  async ensurePage(id: string, url: string): Promise<void> {
    if (this.pages.has(id)) return;
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      this.pages.set(id, page);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => void 0);
    } catch (err) {
      console.error('[browser-preview] falha ao criar página:', err);
    }
  }

  async navigate(id: string, url: string): Promise<void> {
    const page = this.pages.get(id);
    if (!page) return;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => void 0);
  }

  async back(id: string): Promise<void> {
    await this.pages.get(id)?.goBack({ timeout: 15000 }).catch(() => void 0);
  }

  async forward(id: string): Promise<void> {
    await this.pages.get(id)?.goForward({ timeout: 15000 }).catch(() => void 0);
  }

  async reload(id: string): Promise<void> {
    await this.pages.get(id)?.reload({ timeout: 15000 }).catch(() => void 0);
  }

  currentUrl(id: string): string | null {
    return this.pages.get(id)?.url() ?? null;
  }

  /** Snapshot JPEG em data URL — null se o tile não tem página viva ou a captura falhou. */
  async screenshot(id: string): Promise<string | null> {
    const page = this.pages.get(id);
    if (!page) return null;
    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 60, timeout: 5000 });
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /** Automação (Story 10.2, AC1/AC4) — lança erro descritivo, mas nunca derruba o processo. */
  async click(id: string, selector: string): Promise<void> {
    const page = this.pages.get(id);
    if (!page) throw new Error('tile de browser não encontrado ou sem página ativa');
    await page.click(selector, { timeout: 5000 });
  }

  async readText(id: string, selector?: string): Promise<string | null> {
    const page = this.pages.get(id);
    if (!page) return null;
    try {
      return await page.textContent(selector ?? 'body', { timeout: 5000 });
    } catch {
      return null;
    }
  }

  async closePage(id: string): Promise<void> {
    const page = this.pages.get(id);
    this.pages.delete(id);
    await page?.close().catch(() => void 0);
  }

  /** Encerramento gracioso (before-quit) — 0 processos Chromium órfãos. */
  async dispose(): Promise<void> {
    for (const id of [...this.pages.keys()]) await this.closePage(id);
    await this.browser?.close().catch(() => void 0);
    this.browser = null;
    this.launching = null;
  }
}
