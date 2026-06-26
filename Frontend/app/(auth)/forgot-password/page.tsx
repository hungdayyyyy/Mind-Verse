'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try { await authService.forgotPassword(email); setSent(true) } finally { setLoading(false) }
  }

  if (sent) return (
    <div className="text-center space-y-4">
      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
      <p className="text-sm">Check your email for a reset link.</p>
      <Link href="/sign-in" className="text-xs text-violet-600 hover:underline">Back to sign in</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We'll email you a reset link</p>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}</Button>
      <p className="text-center text-xs"><Link href="/sign-in" className="text-muted-foreground hover:underline">Back to sign in</Link></p>
    </form>
  )
}
