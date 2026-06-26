import { baseQuery } from '@/lib/api/baseQuery'
import { ContentItem } from '@/types/content'
import { Project } from '@/types/projects'
import { Deck } from '@/types/learning'

export const sharesService = {
  getSharedContent: (token: string) => baseQuery.get<ContentItem>(`/shares/content/${token}`),
  getSharedProject: (token: string) => baseQuery.get<Project>(`/shares/project/${token}`),
  getSharedDeck: (token: string) => baseQuery.get<Deck>(`/shares/deck/${token}`),
  forkContent: (token: string, projectId: string) =>
    baseQuery.post<ContentItem>(`/shares/content/${token}/fork`, { projectId }),
  forkProject: (token: string) =>
    baseQuery.post<Project>(`/shares/project/${token}/fork`),
}
