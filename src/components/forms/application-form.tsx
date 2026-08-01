'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Stepper } from './stepper';
import { applicationSchema, ApplicationFormValues, STEP_FIELDS, STEP_TITLES } from '@/lib/validation/application';
import { createClient } from '@/lib/supabase/client';
import { generateApplicationId } from '@/lib/ids';
import type { ApplicationLink } from '@/types';

const SKILL_OPTIONS = ['React', 'Next.js', 'Node.js', 'TypeScript', 'UI/UX Design', 'Figma', 'Python', 'SQL', 'DevOps', 'AI/ML'];
const ROLE_OPTIONS = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'AI/ML Engineer', 'DevOps Engineer'];

export function ApplicationForm({ link }: { link: ApplicationLink }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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

      // Upload documents (if provided) to their respective storage buckets.
      let resume_path: string | null = null;
      let photo_path: string | null = null;

      if (resumeFile) {
        const path = `${link.code}/${Date.now()}-${resumeFile.name}`;
        const { error } = await supabase.storage.from('resumes').upload(path, resumeFile);
        if (!error) resume_path = path;
      }
      if (photoFile) {
        const path = `${link.code}/${Date.now()}-${photoFile.name}`;
        const { error } = await supabase.storage.from('photos').upload(path, photoFile);
        if (!error) photo_path = path;
      }

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
        skills: values.skills,
        preferred_role: values.preferred_role,
        resume_path,
        photo_path,
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
      <div className="mx-auto max-w-lg rounded-2xl border border-brand-200 bg-white p-10 text-center shadow-glass">
        <CheckCircle2 className="mx-auto text-brand-600" size={56} />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Application submitted!</h2>
        <p className="mt-2 text-ink-500">
          Your application ID is <span className="font-mono font-semibold text-ink-900">{submitted}</span>.
          We&apos;ve sent a confirmation to your email with the current status.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
          Status: Submitted
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-ink-50 bg-white p-6 shadow-glass sm:p-8">
        <Stepper steps={STEP_TITLES} current={step} />

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
              <FileDrop label="Resume (PDF)" file={resumeFile} onSelect={setResumeFile} accept=".pdf,.doc,.docx" />
              <FileDrop label="Photo" file={photoFile} onSelect={setPhotoFile} accept="image/*" />
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
              <h3 className="font-display text-lg font-semibold text-ink-900">Declaration</h3>
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

        <div className="mt-8 flex items-center justify-between border-t border-ink-50 pt-5">
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
    </form>
  );
}

function FileDrop({
  label,
  file,
  onSelect,
  accept,
}: {
  label: string;
  file: File | null;
  onSelect: (f: File | null) => void;
  accept: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-mist px-3.5 py-2.5 text-sm">
          <span className="truncate text-ink-700">{file.name}</span>
          <button type="button" onClick={() => onSelect(null)} className="text-ink-400 hover:text-coral-500">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-100 bg-mist text-ink-400 hover:border-brand-300 hover:text-brand-600">
          <Upload size={18} />
          <span className="text-xs">Click to upload</span>
          <input type="file" accept={accept} className="hidden" onChange={(e) => onSelect(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
