// Self-explanatory tooltip copy for CRM fields (shown via <InfoHint>). Plain module so both server
// and client components can pull the same wording. Keep these short and beginner-friendly — some BDs
// are new and rely on these to know what each field is for.

export const LEAD_HINTS: Record<string, string> = {
  company: "The client company this opportunity is with.",
  role: "The position the company is hiring for (e.g. Senior Full Stack Engineer).",
  profile: "Which of our marketing dev-profiles we're putting forward for this lead.",
  status: "Where this lead sits in the pipeline. Rejected / Dismissed are set in the Qualification section below (they require a reason).",
  owner: "The BD who owns this lead. Only a BD-Lead or admin can reassign it to someone else.",
  budget: "The budget the company is offering (what they're willing to pay).",
  expected_budget: "The rate we asked for / expect for this role.",
  shift: "The working hours/timezone for this role, if known in advance (free text, e.g. \"US EST, 6pm to 2am PKT\").",
  job_description: "The full job description from the client. Paste it here so anyone can read the requirements.",
  notes: "Private BD notepad: call notes, next steps, anything useful for this deal.",
};

export const INTERVIEW_HINTS: Record<string, string> = {
  job_title: "The role/title this interview is for.",
  company: "The client company conducting the interview.",
  job_post_url: "Link to the original job post (for reference).",
  status: "Scheduling state of this interview (scheduled / completed / cancelled).",
  round: "Which interview round this is (1st, 2nd, …). A new round for the same company auto-advances.",
  outcome: "Result of this round (selected / rejected / pending).",
  received_date: "The date the interview request / email arrived. Defaults to today.",
  interview_at: "The scheduled date & time of the interview.",
  given_by: "The developer who will take (or took) this interview.",
  whom_should_give: "The developer expected to take the next round, if it advances.",
  feedback: "How the interview went: notes from the developer or client.",
};

export const ASSESSMENT_HINTS: Record<string, string> = {
  job_title: "The role/title this assessment is for.",
  company: "The client company that sent the assessment.",
  status: "State of this assessment (pending / completed / cancelled).",
  priority: "How urgent this assessment is.",
  duration: "Expected time to complete (e.g. 1h, 3h).",
  received_date: "The date the assessment arrived. Defaults to today.",
  deadline: "When the assessment must be submitted by.",
  budget: "The budget attached to this role, if known.",
  job_post_url: "Link to the original job post (for reference).",
  completed_by: "The developer who will complete (or completed) the assessment.",
  whom_should_complete: "The developer who should complete it, if different from above.",
  feedback: "Notes on the assessment / how it went.",
};

export const CONTACT_HINTS: Record<string, string> = {
  contact_type: "Who this person is at the company (HR, recruiter, admin, hiring manager, …).",
  name: "The person's name, if known.",
  email: "A direct email we can reach this person on later.",
  phone: "A phone / WhatsApp number for this contact.",
  linkedin_url: "The contact's LinkedIn profile URL.",
  note: "Anything else worth remembering about this contact.",
};
