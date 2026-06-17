import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import type { CustomWorld } from './world.js';

// Cucumber step timeout
setDefaultTimeout(30_000);

let browser: Browser;

BeforeAll(async () => {
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.HEADLESS === 'false' ? 80 : 0,
    args: process.env.DOCKER ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
});

AfterAll(async () => {
  await browser?.close();
});

Before(async function (this: CustomWorld) {
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
  // Playwright navigation and element interaction timeout
  this.page.setDefaultTimeout(15_000);
  this.projects = new Map();
});

After(async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === 'FAILED') {
    const screenshot = await this.page.screenshot().catch(() => undefined);
    if (screenshot) {
      await this.attach(screenshot, 'image/png');
    }
  }
  await this.context?.close();
});
