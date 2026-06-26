'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { sharesService } from '@/services/shares'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LogIn, Copy, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const { isAuthenticated } = useAuthStore()
  const [forking, setForking] = useState(false)

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['shared-content', token],
    queryFn: () => sharesService.getSharedContent(token),
    enabled: !!token,
    retry: false,
  })

  const handleFork = async () => {
    if (!isAuthenticated) { window.location.href = '/sign-in'; return }
    setForking(true)
    try {
      // In real flow, prompt to pick target project first
      window.location.href = '/dashboard'
    } finally { setForking(false) }
  }

  if (isLoading) return (
    <div className="h-screen flex flex-col p-6 gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="flex-1 rounded-xl" />
    </div>
  )

  if (error || !content) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-muted-foreground">This shared link is invalid or has expired.</p>
      <Link href="/sign-in"><Button variant="outline" size="sm">Go to LearnWave</Button></Link>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border bg-background/95 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{content.title}</h1>
            <p className="text-sm text-muted-foreground capitalize">{content.type} • Shared content (read-only)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleFork} disabled={forking} className="gap-1.5">
              {forking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Fork to my library
            </Button>
            <Link href="/sign-in"><Button size="sm" className="gap-1.5"><LogIn className="h-3.5 w-3.5" /> Sign In</Button></Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto max-w-5xl mx-auto w-full p-6">
        {(content.type === 'video' || content.type === 'youtube') && content.source.cloudinaryUrl && (
          <video src={content.source.cloudinaryUrl} controls className="w-full rounded-xl mb-4" />
        )}
        {content.type === 'audio' && content.source.cloudinaryUrl && (
          <audio src={content.source.cloudinaryUrl} controls className="w-full mb-4" />
        )}
        {content.transcript?.text && (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-sm font-semibold mb-2">Transcript</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.transcript.text}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/95 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>Shared content — read only</p>
          <Link href="/sign-up"><Button variant="outline" size="sm">Create your own learning projects</Button></Link>
        </div>
      </div>
    </div>
  )
}
