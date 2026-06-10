export type Role = 'User' | 'Admin';

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  username: string;
  role: string;
  addedAt: string;
}
