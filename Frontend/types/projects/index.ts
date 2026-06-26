export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  ownerId: string
  members: ProjectMember[]
  isPublic: boolean
  shareToken?: string
  itemCount: number
  folderCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  userId: string
  role: MemberRole
  user?: { id: string; name: string; avatar?: string; email: string }
  joinedAt: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface Folder {
  id: string
  name: string
  projectId: string
  parentFolderId?: string
  ownerId: string
  itemCount: number
  order: number
  createdAt: string
  updatedAt: string
}

export interface CreateFolderInput {
  name: string
  projectId: string
  parentFolderId?: string
}

export interface ShareLink {
  id: string
  resourceType: 'project' | 'content' | 'deck' | 'quiz'
  resourceId: string
  token: string
  ownerId: string
  permissions: 'view' | 'fork'
  expiresAt?: string
  accessCount: number
  createdAt: string
}
