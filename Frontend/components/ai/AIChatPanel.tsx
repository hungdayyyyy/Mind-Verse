'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChat } from '@/hooks/learning'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'

const SUGGESTED = [
  'Summarize this content',
  'Create flashcards for me',
  'Quiz me on this topic',
  'Explain the key concepts simply',
]

interface Props { contentItemId?: string; contentTitle?: string }

export function AIChatPanel({ contentItemId, contentTitle }: Props) {
  const { chatPanelOpen, setChatPanelOpen } = useUIStore()
  const { messages, sendMessage, isStreaming, streamingText } = useChat(contentItemId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingText])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim()); setInput('')
  }

  if (!chatPanelOpen) return null

  return (
    <div className="w-80 border-l border-border flex flex-col bg-background shrink-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm">AI Tutor</span>
        </div>
        <div className="flex items-center gap-1">
          {contentTitle && <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full truncate max-w-28">{contentTitle}</span>}
          <button onClick={() => setChatPanelOpen(false)} className="p-1 hover:bg-accent rounded transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Ask me anything</p>
              <p className="text-xs text-muted-foreground mt-1">{contentTitle ? `About "${contentTitle}"` : 'About your learning content'}</p>
            </div>
            <div className="w-full space-y-1.5">
              {SUGGESTED.map((p) => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-sm', msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-muted text-foreground')}>
              {msg.content}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  {msg.sources.map((s, i) => <p key={i} className="text-xs opacity-70 italic">"{s.excerpt}"</p>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-muted rounded-xl px-3 py-2 text-sm">
              {streamingText}<span className="inline-block w-1 h-3.5 bg-foreground ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ask a question..." disabled={isStreaming} className="text-sm h-9" />
          <Button size="sm" onClick={handleSend} disabled={isStreaming || !input.trim()} className="h-9 w-9 p-0 shrink-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
