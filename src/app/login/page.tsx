'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { LogoMark } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    const staffRoles = ['founder', 'super_admin', 'hr_manager', 'recruiter', 'mentor', 'technical_interviewer', 'certificate_manager'];
    const next = params.get('next');
    const destination = next ?? (profile && staffRoles.includes(profile.role) ? '/admin' : '/dashboard');
    router.push(destination);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="rounded-2xl bg-white/95 p-3 shadow-lg">
            <LogoMark size={40} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">Sign in to StoreShift</h1>
          <p className="text-sm text-ink-100/60">Official credentials sent to your email</p>
        </div>

        <form onSubmit={handleLogin} className="glass !bg-white/95 rounded-2xl p-6 shadow-2xl">
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul.int23@storeshift.in" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign In
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-ink-100/50">
          Applying for an internship? Use the link shared with you, or{' '}
          <Link href="/" className="text-brand-400 hover:underline">view open positions</Link>.
        </p>
      </div>
    </main>
  );
}
