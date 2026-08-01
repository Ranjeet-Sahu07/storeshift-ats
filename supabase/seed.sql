-- Default RBAC permission matrix.
-- founder / super_admin implicitly bypass checks in the app layer, but rows
-- are still listed here so the Roles screen has something to render/edit.

insert into role_permissions (role, permission) values
  ('founder', 'applications.manage'), ('founder', 'interns.manage'), ('founder', 'roles.manage'),
  ('founder', 'certificates.generate'), ('founder', 'reports.view'), ('founder', 'settings.manage'),

  ('super_admin', 'applications.manage'), ('super_admin', 'interns.manage'), ('super_admin', 'roles.manage'),
  ('super_admin', 'certificates.generate'), ('super_admin', 'reports.view'), ('super_admin', 'settings.manage'),

  ('hr_manager', 'applications.manage'), ('hr_manager', 'interns.manage'),
  ('hr_manager', 'offers.generate'), ('hr_manager', 'reports.view'),

  ('recruiter', 'applications.review'), ('recruiter', 'links.generate'), ('recruiter', 'interviews.schedule'),

  ('mentor', 'tasks.assign'), ('mentor', 'performance.review'), ('mentor', 'attendance.mark'),
  ('mentor', 'messages.send'),

  ('technical_interviewer', 'interviews.conduct'), ('technical_interviewer', 'applications.view'),

  ('certificate_manager', 'certificates.generate'), ('certificate_manager', 'lor.generate'),
  ('certificate_manager', 'offers.generate'),

  ('intern', 'tasks.view_own'), ('intern', 'attendance.view_own'), ('intern', 'documents.view_own'),

  ('applicant', 'application.view_own')
on conflict do nothing;

insert into email_templates (name, subject, body_html, category) values
  ('Application Received', 'We''ve received your application — StoreShift',
   '<p>Hi {{full_name}},</p><p>Thanks for applying to StoreShift as a {{preferred_role}}. Your application ID is <strong>{{application_id}}</strong>. We''ll be in touch soon.</p>',
   'application'),
  ('Interview Invitation', 'Interview scheduled — StoreShift',
   '<p>Hi {{full_name}},</p><p>You''ve been shortlisted! Your {{stage}} interview is scheduled for {{scheduled_at}}.</p>',
   'interview'),
  ('Offer Letter', 'Welcome to StoreShift 🎉',
   '<p>Hi {{full_name}},</p><p>Congratulations — you''ve been selected for the {{role_title}} internship. Your official StoreShift email is <strong>{{official_email}}</strong>.</p>',
   'offer'),
  ('Application Update', 'An update on your StoreShift application',
   '<p>Hi {{full_name}},</p><p>Your application status has changed to: {{status}}.</p>',
   'rejection')
on conflict do nothing;
