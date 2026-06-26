import { baseQuery, uploadRequest } from '@/lib/api/baseQuery'
import { ContentItem, UploadContentInput } from '@/types/content'

export const contentService = {
  getAll: (projectId: string, folderId?: string) =>
    baseQuery.get<ContentItem[]>('/content', { params: { projectId, folderId } }),
  getById: (id: string) => baseQuery.get<ContentItem>(`/content/${id}`),
  delete: (id: string) => baseQuery.delete<void>(`/content/${id}`),
  reprocess: (id: string) => baseQuery.post<ContentItem>(`/content/${id}/reprocess`),
  share: (id: string, permissions: 'view' | 'fork') =>
    baseQuery.post<{ token: string; shareUrl: string }>(`/content/${id}/share`, { permissions }),
  update: (id: string, data: Partial<Pick<ContentItem, 'title' | 'tags'>>) =>
    baseQuery.patch<ContentItem>(`/content/${id}`, data),

  upload: (file: File, meta: UploadContentInput) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('projectId', meta.projectId)
    if (meta.folderId) fd.append('folderId', meta.folderId)
    if (meta.title) fd.append('title', meta.title)
    return uploadRequest<ContentItem>('/content/upload', fd)
  },

  addYoutube: (url: string, projectId: string, folderId?: string) =>
    baseQuery.post<ContentItem>('/content/youtube', { url, projectId, folderId }),
}
