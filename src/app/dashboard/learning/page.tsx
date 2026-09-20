import { BookOpen, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function LearningPage() {
  const supabase = createClient();
  const { data: resources } = await supabase.from('learning_resources').select('*').order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Learning Resources</h1>
        <p className="text-sm text-ink-500">Curated material from your mentors to help you ramp up.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(resources ?? []).map((r: any) => (
          <a key={r.id} href={r.url} target="_blank" rel="noreferrer">
            <Card className="h-full p-5 transition-shadow hover:shadow-glass">
              <CardContent className="p-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><BookOpen size={18} /></span>
                <p className="mt-3 font-display font-semibold text-ink-900">{r.title}</p>
                <p className="mt-1 text-sm text-ink-500">{r.description}</p>
                <span className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600">Open resource <ExternalLink size={12} /></span>
              </CardContent>
            </Card>
          </a>
        ))}
        {(!resources || resources.length === 0) && (
          <p className="text-sm text-ink-400">No learning resources added yet — check back soon.</p>
        )}
      </div>
    </div>
  );
}
