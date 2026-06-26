'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService, foldersService } from '@/services/projects'
import { CreateProjectInput, CreateFolderInput } from '@/types/projects'

export function useProjects() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['projects'], queryFn: projectsService.getAll, staleTime: 60_000 })

  const createM = useMutation({
    mutationFn: (input: CreateProjectInput) => projectsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateProjectInput> }) =>
      projectsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
  const deleteM = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['projects'] })
      const prev = qc.getQueryData(['projects'])
      qc.setQueryData(['projects'], (old: typeof q.data) => old?.filter((p) => p.id !== id))
      return { prev }
    },
    onError: (_e, _id, ctx) => qc.setQueryData(['projects'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  return {
    projects: q.data ?? [], isLoading: q.isLoading,
    createProject: createM.mutateAsync, updateProject: updateM.mutateAsync,
    deleteProject: deleteM.mutate, isCreating: createM.isPending,
  }
}

export function useProject(id: string) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => projectsService.getById(id), enabled: !!id })
}

export function useFolders(projectId: string) {
  const qc = useQueryClient(); const key = ['folders', projectId]
  const q = useQuery({ queryKey: key, queryFn: () => foldersService.getByProject(projectId), enabled: !!projectId })
  const createM = useMutation({ mutationFn: (i: CreateFolderInput) => foldersService.create(i), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  const updateM = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => foldersService.update(id, name), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  const deleteM = useMutation({ mutationFn: (id: string) => foldersService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  return { folders: q.data ?? [], isLoading: q.isLoading, createFolder: createM.mutateAsync, updateFolder: updateM.mutateAsync, deleteFolder: deleteM.mutate }
}
