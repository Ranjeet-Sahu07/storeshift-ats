'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { LogoMark } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'ready' | 'expired' | 'success';

export default function SetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase's invite-link verify endpoint redirects back here with
    // either `#access_token=...&refresh_token=...&type=invite` on
    // success, or `#error=...&error_code=...` if the link was already
    // used or has expired. Both arrive as a URL *hash* fragment (not a
    // query string), so we parse it manually rather than reading
    // searchParams.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);

    const errorCode = params.get('error_code') || params.get('error');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (errorCode) {
      setStatus('expired');
      return;
    }

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        setStatus(error ? 'expired' : 'ready');
        // Clean the sensitive tokens out of the visible URL once the
        // session is established.
        window.history.replaceState(null, '', window.location.pathname);
      });
      return;
    }

    // No hash at all — check if there's already a valid session (e.g.
    // the user refreshed this page after the tokens were consumed).
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'expired');
    });
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStatus('success');
    toast.success('Password set — welcome to StoreShift!');
    setTimeout(() => router.push('/dashboard'), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="rounded-2xl bg-white/95 p-3 shadow-lg">
            <LogoMark size={40} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">Set Your Password</h1>
          <p className="text-sm text-ink-100/60">Finish setting up your StoreShift account</p>
        </div>

        <div className="glass !bg-white/95 rounded-2xl p-6 shadow-2xl">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="animate-spin text-brand-600" size={28} />
              <p className="text-sm text-ink-500">Verifying your invite…</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldAlert className="text-amber-500" size={32} />
              <p className="font-display font-semibold text-ink-900">This link has expired or was already used</p>
              <p className="text-sm text-ink-500">
                Invite links are single-use and expire after a while. Ask your StoreShift admin to resend your
                invite, or reset your password from the Intern Management panel.
              </p>
              <Button variant="outline" onClick={() => router.push('/login')} className="mt-2">
                Go to Login
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <Label>New Password</Label>
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Set Password &amp; Continue
              </Button>
            </form>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <KeyRound className="text-brand-600" size={28} />
              <p className="font-display font-semibold text-ink-900">You're all set!</p>
              <p className="text-sm text-ink-500">Redirecting to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
