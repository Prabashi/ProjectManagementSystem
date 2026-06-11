import { api } from './api';
import type { Sprint } from '../types';

interface CreateSprintRequest {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}

export const sprintsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSprints: builder.query<Sprint[], string>({
      query: (projectId) => `projects/${projectId}/sprints`,
      providesTags: (_result, _error, projectId) => [{ type: 'Sprint', id: projectId }],
      keepUnusedDataFor: 0,
    }),
    getSprintById: builder.query<Sprint, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => `projects/${projectId}/sprints/${sprintId}`,
      providesTags: (_result, _error, { sprintId }) => [{ type: 'Sprint', id: sprintId }],
    }),
    createSprint: builder.mutation<Sprint, { projectId: string } & CreateSprintRequest>({
      query: ({ projectId, ...body }) => ({
        url: `projects/${projectId}/sprints`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Sprint', id: projectId }],
    }),
    setActiveSprint: builder.mutation<Sprint, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `projects/${projectId}/sprints/${sprintId}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Sprint', id: projectId }],
    }),
    deleteSprint: builder.mutation<void, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `projects/${projectId}/sprints/${sprintId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Sprint', id: projectId }],
    }),
  }),
});

export const {
  useGetSprintsQuery,
  useGetSprintByIdQuery,
  useCreateSprintMutation,
  useSetActiveSprintMutation,
  useDeleteSprintMutation,
} = sprintsApi;
