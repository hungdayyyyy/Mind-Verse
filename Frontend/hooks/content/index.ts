'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentService } from '@/services/content'
import { UploadContentInput } from '@/types/content'

export function useContent(projectId: string, folderId?: string) {
  const qc = useQueryClient(); const key = ['content', projectId, folderId]
  const q = useQuery({ queryKey: key, queryFn: () => contentService.getAll(projectId, folderId), enabled: !!projectId })
  const deleteM = useMutation({ mutationFn: contentService.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['content', projectId] }) })
  const uploadM = useMutation({ mutationFn: ({ file, meta }: { file: File; meta: UploadContentInput }) => contentService.upload(file, meta), onSuccess: () => qc.invalidateQueries({ queryKey: ['content', projectId] }) })
  const youtubeM = useMutation({ mutationFn: ({ url, fId }: { url: string; fId?: string }) => contentService.addYoutube(url, projectId, fId), onSuccess: () => qc.invalidateQueries({ queryKey: ['content', projectId] }) })
  return { items: q.data ?? [], isLoading: q.isLoading, deleteContent: deleteM.mutate, upload: uploadM.mutateAsync, addYoutube: youtubeM.mutateAsync, isUploading: uploadM.isPending || youtubeM.isPending }
}

export function useContentItem(id: string) {
  return useQuery({
    queryKey: ['content-item', id],
    queryFn: () => contentService.getById(id),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.processingStatus
      return s === 'pending' || s === 'processing' ? 3000 : false
    },
  })
}
