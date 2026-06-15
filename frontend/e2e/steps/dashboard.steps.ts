import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world.js';

When('I confirm creating the dashboard', async function (this: CustomWorld) {
  // The confirm button inside the Create Dashboard dialog has aria-label="confirm create dashboard"
  await this.page.getByRole('button', { name: 'confirm create dashboard' }).click();
});

Then('I should see the dashboard page', async function (this: CustomWorld) {
  // Default dashboard name when left blank
  await expect(this.page.getByRole('heading', { name: 'Project Dashboard' })).toBeVisible();
});
