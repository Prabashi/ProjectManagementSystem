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

export type TicketStatus = 'ToDo' | 'InProgress' | 'InReview' | 'ToDeploy' | 'Testing' | 'Done';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  ToDo:       'To Do',
  InProgress: 'In Progress',
  InReview:   'In Review',
  ToDeploy:   'To Deploy',
  Testing:    'Testing',
  Done:       'Done',
};

export const TICKET_STATUSES: TicketStatus[] = ['ToDo', 'InProgress', 'InReview', 'ToDeploy', 'Testing', 'Done'];

export interface Ticket {
  id: string;
  projectId: string;
  sprintId?: string | null;
  subject: string;
  description?: string | null;
  estimate?: number | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  status: TicketStatus;
  boardOrder: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  projectId: string;
  name: string;
  createdByUserId: string;
  createdAt: string;
  activeSprintId?: string | null;
  tickets: Ticket[];
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
}
