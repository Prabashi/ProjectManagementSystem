import { Given, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world.js';

Given(
  'a registered admin user {string} with password {string}',
  async function (this: CustomWorld, username: string, password: string) {
    try {
      await this.apiPost('auth/register', { username, password, role: 'Admin' });
    } catch (e: unknown) {
      // User already exists from a previous run — login will still succeed with the same password
      if (!(e instanceof Error) || !e.message.includes('already taken')) throw e;
    }
  },
);

When('I go to the login page', async function (this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/login`);
  await expect(this.page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
