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
import { applicationSchema, ApplicationFormValues, STEP_FIELDS, STEP_TITLES } from '@/lib/validation/application';
import { createClient } from '@/lib/supabase/client';
import { generateApplicationId } from '@/lib/ids';
import type { ApplicationLink } from '@/types';

const SKILL_OPTIONS = ['React', 'Next.js', 'Node.js', 'TypeScript', 'UI/UX Design', 'Figma', 'Python', 'SQL', 'DevOps', 'AI/ML'];
const ROLE_OPTIONS = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'AI/ML Engineer', 'DevOps Engineer'];
const STEP_ICONS = [User, GraduationCap, Sparkles, FolderOpen, MessageSquareText, ShieldCheck];

export function ApplicationForm({ link }: { link: ApplicationLink }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { skills: [], preferred_role: link.role_title },
  });

  const skills = watch('skills') || [];

  function toggleSkill(skill: string) {
    setValue('skills', skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill], {
      shouldValidate: true,
    });
  }

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: ApplicationFormValues) {
    setSubmitting(true);
    try {
      const supabase = createClient();

      const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true });
      const application_id = generateApplicationId((count ?? 0) + 1);

      const { error: insertError } = await supabase.from('applications').insert({
        application_id,
        link_id: link.id,
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        address: values.address || null,
        city: values.city,
        state: values.state,
        college: values.college,
        degree: values.degree,
        branch: values.branch,
        graduation_year: values.graduation_year,
        cgpa: values.cgpa || null,
        tenth_percentage: values.tenth_percentage || null,
        twelfth_percentage: values.twelfth_percentage || null,
        graduation_percentage: values.graduation_percentage || null,
        skills: values.skills,
        preferred_role: values.preferred_role,
        resume_url: values.resume_url,
        portfolio_url: values.portfolio_url || null,
        github_url: values.github_url || null,
        linkedin_url: values.linkedin_url || null,
        questionnaire: {
          why_storeshift: values.why_storeshift,
          biggest_project: values.biggest_project,
          availability: values.availability,
        },
        declaration_accepted: true,
        declaration_accepted_at: new Date().toISOString(),
        status: 'submitted',
      });

      if (insertError) throw insertError;

      setSubmitted(application_id);
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
                  <Label>Date of Birth</Label>
                  <Input {...register('date_of_birth')} type="date" />
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
                <Label>Address</Label>
                <Textarea {...register('address')} placeholder="Optional" />
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
                  <Label>CGPA (optional)</Label>
                  <Input {...register('cgpa')} type="number" step="0.01" placeholder="8.5" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>10th % (optional)</Label>
                  <Input {...register('tenth_percentage')} type="number" step="0.01" min={0} max={100} placeholder="85" />
                </div>
                <div>
                  <Label>12th % (optional)</Label>
                  <Input {...register('twelfth_percentage')} type="number" step="0.01" min={0} max={100} placeholder="82" />
                </div>
                <div>
                  <Label>Graduation % (optional)</Label>
                  <Input {...register('graduation_percentage')} type="number" step="0.01" min={0} max={100} placeholder="78" />
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
                  <Label>Portfolio URL</Label>
                  <Input {...register('portfolio_url')} error={errors.portfolio_url?.message} placeholder="https://yourportfolio.com" />
                </div>
                <div>
                  <Label>GitHub URL</Label>
                  <Input {...register('github_url')} error={errors.github_url?.message} placeholder="https://github.com/you" />
                </div>
                <div className="sm:col-span-2">
                  <Label>LinkedIn URL</Label>
                  <Input {...register('linkedin_url')} error={errors.linkedin_url?.message} placeholder="https://linkedin.com/in/you" />
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
            <Button type="button" onClick={goNext}>
              Continue <ArrowRight size={16} />
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
          <Button type="button" onClick={goNext} className="flex-1">
            Continue <ArrowRight size={16} />
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
