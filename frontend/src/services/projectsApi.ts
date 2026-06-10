import { api } from './api';
import type { Project, ProjectMember } from '../types';

interface CreateProjectRequest {
  name: string;
  description?: string;
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => 'projects',
      providesTags: ['Project'],
    }),
    getProjectById: builder.query<Project, string>({
      query: (id) => `projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (body) => ({ url: 'projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    getProjectMembers: builder.query<ProjectMember[], string>({
      query: (projectId) => `projects/${projectId}/members`,
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectMember', id: projectId }],
    }),
    addProjectMember: builder.mutation<void, { projectId: string; userId: string }>({
      query: ({ projectId, userId }) => ({
        url: `projects/${projectId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
} = projectsApi;
