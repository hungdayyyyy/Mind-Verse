import { baseQuery } from '@/lib/api/baseQuery'
import { Project, CreateProjectInput, Folder, CreateFolderInput, ShareLink } from '@/types/projects'

export const projectsService = {
  getAll: () => baseQuery.get<Project[]>('/projects'),
  getById: (id: string) => baseQuery.get<Project>(`/projects/${id}`),
  create: (input: CreateProjectInput) => baseQuery.post<Project>('/projects', input),
  update: (id: string, input: Partial<CreateProjectInput>) =>
    baseQuery.patch<Project>(`/projects/${id}`, input),
  delete: (id: string) => baseQuery.delete<void>(`/projects/${id}`),
  share: (id: string, permissions: 'view' | 'fork') =>
    baseQuery.post<{ token: string; shareUrl: string }>(`/projects/${id}/share`, { permissions }),
  addMember: (id: string, email: string, role: string) =>
    baseQuery.post<Project>(`/projects/${id}/members`, { email, role }),
  removeMember: (id: string, userId: string) =>
    baseQuery.delete<Project>(`/projects/${id}/members/${userId}`),
}

export const foldersService = {
  getByProject: (projectId: string) =>
    baseQuery.get<Folder[]>('/folders', { params: { projectId } }),
  create: (input: CreateFolderInput) => baseQuery.post<Folder>('/folders', input),
  update: (id: string, name: string) => baseQuery.patch<Folder>(`/folders/${id}`, { name }),
  delete: (id: string) => baseQuery.delete<void>(`/folders/${id}`),
  move: (id: string, parentFolderId: string | null) =>
    baseQuery.patch<Folder>(`/folders/${id}/move`, { parentFolderId }),
}
