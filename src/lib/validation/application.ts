import { z } from 'zod';

export const applicationSchema = z.object({
  // Step 1 — Personal Information
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),

  // Step 2 — Education
  college: z.string().min(2, 'College name is required'),
  degree: z.string().min(1, 'Degree is required'),
  branch: z.string().min(1, 'Branch/Major is required'),
  graduation_year: z.coerce.number().min(2020).max(2032),
  cgpa: z.coerce.number().min(0).max(10).optional(),
  tenth_percentage: z.coerce.number().min(0).max(100).optional(),
  twelfth_percentage: z.coerce.number().min(0).max(100).optional(),
  graduation_percentage: z.coerce.number().min(0).max(100).optional(),

  // Step 3 — Skills
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
  preferred_role: z.string().min(1, 'Select a preferred role'),

  // Step 4 — Documents (resume is a link — Google Drive / Dropbox / etc. —
  // not a file upload, so it's always one click to open, no signed URLs)
  resume_url: z.string().url('Enter a valid resume link (e.g. Google Drive share link)'),
  portfolio_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  github_url: z.string().url('Enter a valid GitHub URL').or(z.literal('')).optional(),
  linkedin_url: z.string().url('Enter a valid LinkedIn URL').or(z.literal('')).optional(),

  // Step 5 — Questionnaire
  why_storeshift: z.string().min(20, 'Tell us a bit more (min. 20 characters)'),
  biggest_project: z.string().min(20, 'Tell us a bit more (min. 20 characters)'),
  availability: z.string().min(1, 'Select your availability'),

  // Step 6 — Declaration
  declaration_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the declaration to submit' }),
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const STEP_FIELDS: Record<number, (keyof ApplicationFormValues)[]> = {
  0: ['full_name', 'email', 'phone', 'city', 'state'],
  1: ['college', 'degree', 'branch', 'graduation_year'],
  2: ['skills', 'preferred_role'],
  3: ['resume_url'],
  4: ['why_storeshift', 'biggest_project', 'availability'],
  5: ['declaration_accepted'],
};

export const STEP_TITLES = ['Personal Information', 'Education', 'Skills', 'Documents', 'Questionnaire', 'Declaration'];

/**
 * Fields that are optional by default but can be marked mandatory for a
 * specific application link (Admin → Application Links). `step` says
 * which step of the form they live on, so the form can validate them at
 * the right point instead of only at final submit.
 */
export const OPTIONAL_FIELD_REGISTRY: { key: string; label: string; step: number }[] = [
  { key: 'date_of_birth', label: 'Date of Birth', step: 0 },
  { key: 'gender', label: 'Gender', step: 0 },
  { key: 'address', label: 'Address', step: 0 },
  { key: 'cgpa', label: 'CGPA', step: 1 },
  { key: 'tenth_percentage', label: '10th %', step: 1 },
  { key: 'twelfth_percentage', label: '12th %', step: 1 },
  { key: 'graduation_percentage', label: 'Graduation %', step: 1 },
  { key: 'portfolio_url', label: 'Portfolio URL', step: 3 },
  { key: 'github_url', label: 'GitHub URL', step: 3 },
  { key: 'linkedin_url', label: 'LinkedIn URL', step: 3 },
];
