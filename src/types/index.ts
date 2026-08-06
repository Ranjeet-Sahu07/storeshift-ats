export type UserRole =
  | 'founder'
  | 'super_admin'
  | 'hr_manager'
  | 'recruiter'
  | 'mentor'
  | 'technical_interviewer'
  | 'certificate_manager'
  | 'intern'
  | 'applicant';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'assignment_sent'
  | 'interview_scheduled'
  | 'interviewed'
  | 'on_hold'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'half_day';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  official_email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApplicationLink {
  id: string;
  code: string;
  label: string;
  role_title: string;
  department: string | null;
  created_by: string | null;
  max_applications: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  application_count?: number;
}

export interface Application {
  id: string;
  application_id: string;
  link_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  college: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  graduation_percentage: number | null;
  skills: string[];
  preferred_role: string | null;
  resume_url: string | null;
  resume_path: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  questionnaire: Record<string, string>;
  declaration_accepted: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface Internship {
  id: string;
  application_id: string | null;
  intern_id: string;
  mentor_id: string | null;
  department: string;
  role_title: string;
  skills: string[];
  start_date: string;
  end_date: string;
  duration_months: number;
  access_level: string;
  status: 'active' | 'completed' | 'terminated';
  github_repo_url: string | null;
}

export interface Task {
  id: string;
  internship_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  github_repo_url: string | null;
  pull_request_url: string | null;
  progress: number;
  position: number;
}

export interface Certificate {
  id: string;
  certificate_id: string;
  internship_id: string;
  intern_name: string;
  role_title: string;
  department: string;
  duration_text: string;
  skills: string[];
  issue_date: string;
  completion_date: string;
  qr_verification_url: string;
  status: 'issued' | 'revoked';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  founder: 'Founder',
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  recruiter: 'Recruiter',
  mentor: 'Mentor',
  technical_interviewer: 'Technical Interviewer',
  certificate_manager: 'Certificate Manager',
  intern: 'Intern',
  applicant: 'Applicant',
};

export const STAFF_ROLES: UserRole[] = [
  'founder', 'super_admin', 'hr_manager', 'recruiter',
  'mentor', 'technical_interviewer', 'certificate_manager',
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  assignment_sent: 'Assignment Sent',
  interview_scheduled: 'Interview Scheduled',
  interviewed: 'Interviewed',
  on_hold: 'On Hold',
  selected: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};
