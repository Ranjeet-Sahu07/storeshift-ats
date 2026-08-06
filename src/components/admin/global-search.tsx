'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileSearch, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Result {
  id: string;
  full_name: string;
  application_id: string;
  preferred_role: string | null;
  status: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('applications')
        .select('id, full_name, application_id, preferred_role, status')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,application_id.ilike.%${query}%`)
        .limit(8);
      setResults((data as Result[]) ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function goTo(id: string) {
    router.push(`/admin/applicants/${id}`);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={boxRef} className="relative hidden sm:block sm:w-72 lg:w-80">
      <div className="flex items-center gap-2 rounded-xl bg-mist px-3.5 py-2 text-sm text-ink-500">
        <Search size={16} className="shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search applicants by name, email, ID…"
          className="w-full bg-transparent outline-none placeholder:text-ink-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-ink-400 hover:text-ink-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-ink-50 bg-white shadow-glass">
          {loading && <p className="px-4 py-3 text-xs text-ink-400">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-xs text-ink-400">No matches for "{query}"</p>}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => goTo(r.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-mist"
            >
              <FileSearch size={15} className="shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{r.full_name}</span>
                <span className="block truncate text-xs text-ink-400">{r.application_id} · {r.preferred_role}</span>
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', 'bg-brand-50 text-brand-700')}>
                {r.status.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
