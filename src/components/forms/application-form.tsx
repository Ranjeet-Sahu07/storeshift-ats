'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, FileText, User, GraduationCap, Sparkles, FolderOpen, MessageSquareText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Stepper } from './stepper';
import { LogoMark } from '@/components/ui/logo';
import { applicationSchema, ApplicationFormValues, STEP_FIELDS, STEP_TITLES, OPTIONAL_FIELD_REGISTRY } from '@/lib/validation/application';
import { createClient } from '@/lib/supabase/client';
import type { ApplicationLink } from '@/types';

const SKILL_OPTIONS = ['React', 'Next.js', 'Node.js', 'TypeScript', 'UI/UX Design', 'Figma', 'Python', 'SQL', 'DevOps', 'AI/ML'];
const ROLE_OPTIONS = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'AI/ML Engineer', 'DevOps Engineer'];
const STEP_ICONS = [User, GraduationCap, Sparkles, FolderOpen, MessageSquareText, ShieldCheck];

export function ApplicationForm({ link }: { link: ApplicationLink }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { skills: [], preferred_role: link.role_title },
  });

  const skills = watch('skills') || [];
  const requiredKeys = new Set(link.required_fields ?? []);
  const isAdminRequired = (key: string) => requiredKeys.has(key);

  // Admin-required-field errors are tracked in plain React state,
  // deliberately kept OUTSIDE react-hook-form's own error state. Zod's
  // resolver re-validates and rewrites the *entire* errors object on
  // every trigger()/handleSubmit() call — a manually `setError()`'d
  // entry for a field the schema itself considers optional (like
  // "address") was getting silently clobbered on the very next
  // validation pass, which is why Continue could get stuck: the check
  // that gated advancing and the error state shown to the user could
  // fall out of sync with each other. A separate, plain state object
  // has no such interaction with the resolver.
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});

  function toggleSkill(skill: string) {
    setValue('skills', skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill], {
      shouldValidate: true,
    });
  }

  async function goNext() {
    if (validating) return;
    setValidating(true);
    try {
      const fields = STEP_FIELDS[step];
      const valid = fields.length === 0 || (await trigger(fields));
      if (!valid) return;

      // Fields that are normally optional but this specific link marked
      // mandatory (Admin → Application Links) — checked separately from
      // the static zod schema since which fields are required varies
      // per-link, not per-form. getValues() (not watch()) is used here
      // deliberately — it's react-hook-form's documented way to read a
      // current value imperatively at a single point in time, exactly
      // this "check right now, on click" case.
      const currentValues = getValues();
      const stepErrors: Record<string, string> = {};
      for (const f of OPTIONAL_FIELD_REGISTRY) {
        if (f.step !== step || !requiredKeys.has(f.key)) continue;
        const value = currentValues[f.key as keyof ApplicationFormValues];
        if (value === undefined || value === null || value === '') {
          stepErrors[f.key] = `${f.label} is required for this role`;
        }
      }

      // Only touch the keys relevant to this step — keep whatever was
      // recorded for other steps intact, in case the user navigates back
      // and forth.
      setAdminErrors((prev) => {
        const next = { ...prev };
        for (const f of OPTIONAL_FIELD_REGISTRY) {
          if (f.step !== step) continue;
          if (stepErrors[f.key]) next[f.key] = stepErrors[f.key];
          else delete next[f.key];
        }
        return next;
      });

      if (Object.keys(stepErrors).length > 0) return;

      setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
    } finally {
      setValidating(false);
    }
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: ApplicationFormValues) {
    setSubmitting(true);
    try {
      const supabase = createClient();

      // Calls the submit_application() SECURITY DEFINER function instead
      // of writing to `applications` directly — it runs with elevated
      // privileges, so it doesn't depend on the anon role's RLS grants
      // at submission time, and it makes "same email on this link =
      // correction, not a new row" atomic (one round trip instead of a
      // separate check-then-insert-or-update from the browser).
      const { data: application_id, error } = await supabase.rpc('submit_application', {
        p_link_id: link.id,
        p_full_name: values.full_name,
        p_email: values.email,
        p_phone: values.phone,
        p_date_of_birth: values.date_of_birth || null,
        p_gender: values.gender || null,
        p_address: values.address || null,
        p_city: values.city,
        p_state: values.state,
        p_college: values.college,
        p_degree: values.degree,
        p_branch: values.branch,
        p_graduation_year: values.graduation_year,
        p_cgpa: values.cgpa || null,
        p_tenth_percentage: values.tenth_percentage || null,
        p_twelfth_percentage: values.twelfth_percentage || null,
        p_graduation_percentage: values.graduation_percentage || null,
        p_skills: values.skills,
        p_preferred_role: values.preferred_role,
        p_resume_url: values.resume_url,
        p_portfolio_url: values.portfolio_url || null,
        p_github_url: values.github_url || null,
        p_linkedin_url: values.linkedin_url || null,
        p_questionnaire: {
          why_storeshift: values.why_storeshift,
          biggest_project: values.biggest_project,
          availability: values.availability,
        },
        p_declaration_accepted: true,
        p_declaration_accepted_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSubmitted(application_id as string);
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong submitting your application.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-brand-200 bg-white p-8 text-center shadow-glass sm:p-10">
        <div className="flex justify-center"><LogoMark size={44} /></div>
        <CheckCircle2 className="mx-auto mt-4 text-brand-600" size={48} />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Application submitted!</h2>
        <p className="mt-2 text-ink-500">
          Your application ID is <span className="font-mono font-semibold text-ink-900">{submitted}</span>.
          We've sent a confirmation to your email with the current status.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
          Status: Submitted
        </div>
        <div className="mt-8 space-y-2 border-t border-ink-50 pt-6 text-left text-sm text-ink-500">
          <p className="font-semibold text-ink-900">What happens next?</p>
          <p>1. Our hiring team reviews your application and resume.</p>
          <p>2. If shortlisted, you'll be invited to an interview by email.</p>
          <p>3. Selected candidates receive an official offer and StoreShift account.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl pb-24 sm:pb-0">
      <div className="rounded-none border-0 bg-white p-4 shadow-none sm:rounded-2xl sm:border sm:border-ink-50 sm:p-8 sm:shadow-glass">
        <Stepper steps={STEP_TITLES} current={step} icons={STEP_ICONS} />

        <div className="mt-8 space-y-5">
          {step === 0 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full Name</Label>
                  <Input {...register('full_name')} error={errors.full_name?.message} placeholder="Aarav Sharma" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input {...register('email')} type="email" error={errors.email?.message} placeholder="aarav@email.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...register('phone')} error={errors.phone?.message} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <Label>Date of Birth{isAdminRequired('date_of_birth') && <span className="text-coral-500"> *</span>}</Label>
                  <Input {...register('date_of_birth')} type="date" error={(errors.date_of_birth?.message as string) || adminErrors.date_of_birth} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...register('city')} error={errors.city?.message} placeholder="Mumbai" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input {...register('state')} error={errors.state?.message} placeholder="Maharashtra" />
                </div>
              </div>
              <div>
                <Label>Address{isAdminRequired('address') && <span className="text-coral-500"> *</span>}</Label>
                <Textarea {...register('address')} placeholder="Optional" error={(errors.address?.message as string) || adminErrors.address} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Education</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>College / University</Label>
                  <Input {...register('college')} error={errors.college?.message} placeholder="e.g. VJTI Mumbai" />
                </div>
                <div>
                  <Label>Degree</Label>
                  <Input {...register('degree')} error={errors.degree?.message} placeholder="B.Tech" />
                </div>
                <div>
                  <Label>Branch / Major</Label>
                  <Input {...register('branch')} error={errors.branch?.message} placeholder="Computer Science" />
                </div>
                <div>
                  <Label>Graduation Year</Label>
                  <Input {...register('graduation_year')} type="number" error={errors.graduation_year?.message} placeholder="2026" />
                </div>
                <div>
                  <Label>CGPA{isAdminRequired('cgpa') ? <span className="text-coral-500"> *</span> : ' (optional)'}</Label>
                  <Input {...register('cgpa')} type="number" step="0.01" placeholder="8.5" error={(errors.cgpa?.message as string) || adminErrors.cgpa} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>10th %{isAdminRequired('tenth_percentage') ? <span className="text-coral-500"> *</span> : ' (optional)'}</Label>
                  <Input {...register('tenth_percentage')} type="number" step="0.01" min={0} max={100} placeholder="85" error={(errors.tenth_percentage?.message as string) || adminErrors.tenth_percentage} />
                </div>
                <div>
                  <Label>12th %{isAdminRequired('twelfth_percentage') ? <span className="text-coral-500"> *</span> : ' (optional)'}</Label>
                  <Input {...register('twelfth_percentage')} type="number" step="0.01" min={0} max={100} placeholder="82" error={(errors.twelfth_percentage?.message as string) || adminErrors.twelfth_percentage} />
                </div>
                <div>
                  <Label>Graduation %{isAdminRequired('graduation_percentage') ? <span className="text-coral-500"> *</span> : ' (optional)'}</Label>
                  <Input {...register('graduation_percentage')} type="number" step="0.01" min={0} max={100} placeholder="78" error={(errors.graduation_percentage?.message as string) || adminErrors.graduation_percentage} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Skills</h3>
              <div>
                <Label>Select your skills</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        skills.includes(s)
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-ink-100 bg-white text-ink-600 hover:border-brand-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {errors.skills && <p className="mt-1.5 text-xs text-coral-500">{errors.skills.message as string}</p>}
              </div>
              <div>
                <Label>Preferred Role</Label>
                <Select {...register('preferred_role')} error={errors.preferred_role?.message}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Documents</h3>
              <div>
                <Label>Resume Link</Label>
                <div className="relative">
                  <FileText size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                  <Input
                    {...register('resume_url')}
                    error={errors.resume_url?.message}
                    placeholder="https://drive.google.com/... (share link, view access)"
                    className="pl-10"
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-400">
                  Upload your resume to Google Drive / Dropbox, set sharing to "Anyone with the link", and paste it here.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Portfolio URL{isAdminRequired('portfolio_url') && <span className="text-coral-500"> *</span>}</Label>
                  <Input {...register('portfolio_url')} error={errors.portfolio_url?.message || adminErrors.portfolio_url} placeholder="https://yourportfolio.com" />
                </div>
                <div>
                  <Label>GitHub URL{isAdminRequired('github_url') && <span className="text-coral-500"> *</span>}</Label>
                  <Input {...register('github_url')} error={errors.github_url?.message || adminErrors.github_url} placeholder="https://github.com/you" />
                </div>
                <div className="sm:col-span-2">
                  <Label>LinkedIn URL{isAdminRequired('linkedin_url') && <span className="text-coral-500"> *</span>}</Label>
                  <Input {...register('linkedin_url')} error={errors.linkedin_url?.message || adminErrors.linkedin_url} placeholder="https://linkedin.com/in/you" />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Questionnaire</h3>
              <div>
                <Label>Why do you want to intern at StoreShift?</Label>
                <Textarea {...register('why_storeshift')} error={errors.why_storeshift?.message} rows={4} />
              </div>
              <div>
                <Label>Tell us about your biggest project so far</Label>
                <Textarea {...register('biggest_project')} error={errors.biggest_project?.message} rows={4} />
              </div>
              <div>
                <Label>Availability</Label>
                <Select {...register('availability')} error={errors.availability?.message}>
                  <option value="">Select…</option>
                  <option value="full_time">Full-time (immediate)</option>
                  <option value="part_time">Part-time</option>
                  <option value="starts_in_month">Available in a month</option>
                </Select>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h3 className="font-display text-lg font-semibold text-ink-900">Review & Declaration</h3>

              <div className="overflow-hidden rounded-xl border border-ink-100">
                <div className="border-b border-ink-100 bg-mist px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Application Summary</p>
                </div>
                <dl className="divide-y divide-ink-50 text-sm">
                  <SummaryRow label="Name" value={watch('full_name')} />
                  <SummaryRow label="Email" value={watch('email')} />
                  <SummaryRow label="Phone" value={watch('phone')} />
                  <SummaryRow label="College" value={watch('college')} />
                  <SummaryRow label="Applying For" value={watch('preferred_role')} />
                  <SummaryRow label="Skills" value={skills.join(', ')} />
                  <SummaryRow label="Resume Link" value={watch('resume_url')} truncate />
                </dl>
              </div>

              <div className="rounded-xl bg-mist p-4 text-sm text-ink-600">
                I hereby declare that the information provided in this application is true and
                accurate to the best of my knowledge. I understand that any false information
                may lead to disqualification from the StoreShift internship program.
              </div>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" {...register('declaration_accepted')} className="mt-1 h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-ink-700">I accept the declaration above and consent to StoreShift processing my application data.</span>
              </label>
              {errors.declaration_accepted && (
                <p className="text-xs text-coral-500">{errors.declaration_accepted.message}</p>
              )}
            </>
          )}
        </div>

        <div className="mt-8 hidden items-center justify-between border-t border-ink-50 pt-5 sm:flex">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
            <ArrowLeft size={16} /> Back
          </Button>
          {step < STEP_TITLES.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={validating}>
              {validating ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Submit Application
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: sticky bottom action bar so Back/Continue are always reachable
          without scrolling, since most applicants fill this out on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-ink-100 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0} className="flex-1">
          <ArrowLeft size={16} /> Back
        </Button>
        {step < STEP_TITLES.length - 1 ? (
          <Button type="button" onClick={goNext} className="flex-1" disabled={validating}>
            {validating ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Submit
          </Button>
        )}
      </div>
    </form>
  );
}

function SummaryRow({ label, value, truncate }: { label: string; value?: string; truncate?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-ink-400">{label}</dt>
      <dd className={`text-right font-medium text-ink-900 ${truncate ? 'max-w-[220px] truncate' : ''}`}>
        {value || <span className="text-ink-300">Not provided</span>}
      </dd>
    </div>
  );
}
