'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/progress';

export default function InternSettingsPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    });
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ phone: profile.phone }).eq('id', profile.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Profile updated');
  }

  async function changePassword() {
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message); else { toast.success('Password updated'); setPassword(''); }
  }

  if (!profile) {
    return (
      <div className="max-w-lg space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Manage your profile and account security.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={profile.full_name} disabled />
          </div>
          <div>
            <Label>Login Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div>
            <Label>Official StoreShift Email</Label>
            <Input value={profile.official_email ?? 'Not yet assigned — ask HR/Admin'} disabled className={!profile.official_email ? 'italic text-ink-400' : ''} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button size="sm" onClick={saveProfile} disabled={saving}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button size="sm" onClick={changePassword}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
