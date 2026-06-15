import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world.js';

Given('I am logged in as an admin', async function (this: CustomWorld) {
  await this.loginAsAdmin();
  await this.page.goto(this.baseUrl);
  await expect(this.page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});

Given('a project {string} exists', async function (this: CustomWorld, name: string) {
  await this.createProject(name);
});

Given(
  'a user {string} with password {string} and role {string} exists',
  async function (this: CustomWorld, username: string, password: string, role: string) {
    await this.apiPost('auth/register', { username, password, role });
  },
);

When('I click {string}', async function (this: CustomWorld, label: string) {
  // MUI Dialogs apply aria-hidden to background content, so role queries are
  // naturally scoped to the foreground — no manual dialog scoping needed.
  await this.page.getByRole('button', { name: label }).click();
});

When(
  'I fill in {string} with {string}',
  async function (this: CustomWorld, fieldLabel: string, value: string) {
    // exact: false tolerates MUI's required-field asterisk in label text
    await this.page.getByLabel(fieldLabel, { exact: false }).fill(value);
  },
);

When('I click the {string} tab', async function (this: CustomWorld, tabName: string) {
  await this.page.getByRole('tab', { name: tabName }).click();
});

When(
  'I go to the project page for {string}',
  async function (this: CustomWorld, projectName: string) {
    const project = this.getProject(projectName);
    await this.page.goto(`${this.baseUrl}/projects/${project.id}`);
    await expect(this.page.getByRole('heading', { name: project.name })).toBeVisible();
  },
);

When(
  'I go to the dashboard for {string}',
  async function (this: CustomWorld, projectName: string) {
    const project = this.getProject(projectName);
    await this.page.goto(`${this.baseUrl}/projects/${project.id}/dashboard`);
    // Wait for the no-dashboard prompt to appear (dashboard does not exist yet)
    await expect(this.page.getByRole('button', { name: 'Create Dashboard' })).toBeVisible();
  },
);

When(
  'I select {string} from the user dropdown',
  async function (this: CustomWorld, username: string) {
    await this.page.getByRole('combobox', { name: 'User' }).click();
    await this.page.getByRole('option', { name: new RegExp(username) }).click();
  },
);

Then('I should see {string} in the page', async function (this: CustomWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible();
});

Then(
  'I should see the {string} heading',
  async function (this: CustomWorld, heading: string) {
    await expect(this.page.getByRole('heading', { name: heading })).toBeVisible();
  },
);
