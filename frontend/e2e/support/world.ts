import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';

interface WorldParams {
  baseUrl: string;
  apiUrl: string;
}

interface TestProject {
  id: string;
  name: string;
}

export class CustomWorld extends World {
  context!: BrowserContext;
  page!: Page;
  baseUrl: string;
  apiUrl: string;
  projects = new Map<string, TestProject>();

  constructor(options: IWorldOptions) {
    super(options);
    const params = options.parameters as WorldParams;
    this.baseUrl = params.baseUrl;
    this.apiUrl = params.apiUrl;
  }

  async apiPost(path: string, body: unknown): Promise<Record<string, unknown>> {
    const response = await this.page.request.post(`${this.apiUrl}/${path}`, {
      data: body,
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`POST /${path} failed ${response.status()}: ${text}`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async loginAsAdmin(): Promise<void> {
    const username = `admin_${Date.now()}`;
    const password = 'Admin1234!';
    await this.apiPost('auth/register', { username, password, role: 'Admin' });
    await this.apiPost('auth/login', { username, password });
  }

  async createProject(name: string): Promise<TestProject> {
    const data = await this.apiPost('projects', { name });
    const project: TestProject = { id: data.id as string, name: data.name as string };
    this.projects.set(name, project);
    return project;
  }

  getProject(name: string): TestProject {
    const project = this.projects.get(name);
    if (!project) throw new Error(`Project "${name}" not found in test state`);
    return project;
  }
}

setWorldConstructor(CustomWorld);
