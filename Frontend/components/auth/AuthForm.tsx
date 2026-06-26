'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/auth'
import { authService } from '@/services/auth'
import { Loader2 } from 'lucide-react'

interface Props { mode: 'sign-in' | 'sign-up' }

export function AuthForm({ mode }: Props) {
  const { signIn, signUp, isPending, signInError } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    try {
      if (mode === 'sign-in') await signIn({ email, password })
      else {
        if (!name.trim()) { setError('Name is required'); return }
        await signUp({ email, password, name })
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Something went wrong')
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 justify-center mb-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <span className="font-semibold text-lg">LearnWave</span>
        </div>
        <h1 className="text-xl font-semibold">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-sm text-muted-foreground">{mode === 'sign-in' ? 'Sign in to continue learning' : 'Start turning anything into knowledge'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <Label className="text-xs mb-1.5 block">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="text-sm" />
          </div>
        )}
        <div>
          <Label className="text-xs mb-1.5 block">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="text-sm" required />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="text-sm" required minLength={8} />
        </div>
        {(error || signInError) && <p className="text-xs text-red-500">{error || (signInError as { message?: string })?.message}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <Button variant="outline" className="w-full gap-2" onClick={() => authService.googleAuth()}>
        Continue with Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {mode === 'sign-in' ? (
          <>Don't have an account? <Link href="/sign-up" className="text-violet-600 font-medium hover:underline">Sign up</Link></>
        ) : (
          <>Already have an account? <Link href="/sign-in" className="text-violet-600 font-medium hover:underline">Sign in</Link></>
        )}
      </p>
      {mode === 'sign-in' && (
        <p className="text-center text-xs"><Link href="/forgot-password" className="text-muted-foreground hover:underline">Forgot password?</Link></p>
      )}
    </div>
  )
}
