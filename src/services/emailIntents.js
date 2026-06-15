const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function wrapInLayout(bodyHtml) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0f172a;padding:24px;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">JobsDirect.ie</h1>
      </div>
      <div style="padding:24px">
        ${bodyHtml}
      </div>
      <div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px">
        &copy; ${new Date().getFullYear()} JobsDirect.ie &mdash; Ireland's Job Platform
      </div>
    </div>
  `;
}

function button(href, text) {
  return `<p style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;background:#0f172a;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">${text}</a></p>`;
}

export const INTENTS = {
  VERIFICATION_EMAIL: (data) => ({
    to: data.user.email,
    subject: "Verify your email - JobsDirect.ie",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Verify your email</h2>
      <p>Hi ${data.user.first_name},</p>
      <p>Thanks for signing up! Please verify your email address to get started:</p>
      ${button(`${FRONTEND_URL}/verify-email?token=${data.verification_token}`, "Verify Email")}
      <p style="color:#666;font-size:14px">If the button doesn't work, copy and paste this link:</p>
      <p style="color:#666;font-size:12px;word-break:break-all">${FRONTEND_URL}/verify-email?token=${data.verification_token}</p>
    `),
  }),

  WELCOME: (data) => ({
    to: data.user.email,
    subject: "Welcome to JobsDirect.ie!",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Welcome to JobsDirect.ie!</h2>
      <p>Hi ${data.user.first_name},</p>
      <p>Your email has been verified and your account is ready. You can now:</p>
      <ul>
        <li>Browse and apply for jobs across Ireland</li>
        <li>Build your professional profile</li>
        <li>Get matched with top employers</li>
      </ul>
      ${button(`${FRONTEND_URL}/jobs`, "Browse Jobs")}
    `),
  }),

  PASSWORD_RESET: (data) => ({
    to: data.user.email,
    subject: "Password Reset - JobsDirect.ie",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Password Reset</h2>
      <p>Hi ${data.user.first_name},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      ${button(`${FRONTEND_URL}/auth?token=${data.resetToken}`, "Reset Password")}
      <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `),
  }),

  PASSWORD_CHANGED: (data) => ({
    to: data.user.email,
    subject: "Password Changed - JobsDirect.ie",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Password Changed</h2>
      <p>Hi ${data.user.first_name},</p>
      <p>Your password has been successfully changed.</p>
      <p style="color:#666;font-size:14px">If you didn't make this change, please contact us immediately at <a href="mailto:info@jobsdirect.ie">info@jobsdirect.ie</a>.</p>
    `),
  }),

  // ─── Employer Notifications ───

  JOB_APPROVED: (data) => ({
    to: data.employer.email,
    subject: `Your job "${data.job.title}" is live - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Your job is live!</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p>Your job listing <strong>"${data.job.title}"</strong> has been approved and is now live on JobsDirect.ie.</p>
      ${button(`${FRONTEND_URL}/jobs/${data.job.id}`, "View Your Listing")}
    `),
  }),

  JOB_REJECTED: (data) => ({
    to: data.employer.email,
    subject: `Job listing needs updates - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Job listing needs updates</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p>Your job listing <strong>"${data.job.title}"</strong> was not approved. Please review and resubmit.</p>
      ${button(`${FRONTEND_URL}/dashboard/jobs`, "Update Listing")}
    `),
  }),

  JOB_FLAGGED: (data) => {
    const issueList = (data.issues || []).map(i => `<li><strong>"${i.text}"</strong> — ${i.reason} <em>(${(i.category || "").replace(/_/g, " ")})</em></li>`).join("");
    return {
      to: data.employer.email,
      subject: `Action required: Job listing flagged - JobsDirect.ie`,
      html: wrapInLayout(`
        <h2 style="color:#0f172a">Your job listing needs revision</h2>
        <p>Hi ${data.employer.first_name},</p>
        <p>Your job listing <strong>"${data.job.title}"</strong> has been flagged by our compliance system for language that may not comply with Irish employment equality laws.</p>
        ${issueList ? `<p><strong>Issues found:</strong></p><ul style="margin:12px 0;padding-left:20px">${issueList}</ul>` : ""}
        <p>Under the Employment Equality Acts 1998–2015, job advertisements must not discriminate on any of the 9 protected grounds.</p>
        <p>Please revise the highlighted text and resubmit your listing.</p>
        ${button(`${FRONTEND_URL}/dashboard/jobs`, "Revise Your Listing")}
      `),
    };
  },

  JOB_EXPIRING: (data) => ({
    to: data.employer.email,
    subject: `Your job "${data.job.title}" expires in 3 days - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Your listing is expiring soon</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p>Your job listing <strong>"${data.job.title}"</strong> will expire in 3 days.</p>
      ${button(`${FRONTEND_URL}/dashboard/jobs`, "Renew Now")}
    `),
  }),

  NEW_APPLICATION: (data) => ({
    to: data.employer.email,
    subject: `New application for "${data.job.title}" - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">New application received</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p><strong>${data.applicantName}</strong> has applied for <strong>"${data.job.title}"</strong>.</p>
      ${button(`${FRONTEND_URL}/dashboard/applications`, "View Applications")}
    `),
  }),

  APPLICATION_SUBMITTED: (data) => ({
    to: data.candidate.email,
    subject: `Application submitted for "${data.job.title}" - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Application submitted</h2>
      <p>Hi ${data.candidate.name},</p>
      <p>Your application for <strong>"${data.job.title}"</strong> at <strong>${data.job.company_name}</strong> has been submitted.</p>
      ${button(`${FRONTEND_URL}/dashboard`, "Track Application")}
    `),
  }),

  APPLICATION_STATUS_CHANGED: (data) => ({
    to: data.candidate.email,
    subject: `Application update: ${data.status} - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Application update</h2>
      <p>Hi ${data.candidate.name},</p>
      <p>Your application for <strong>"${data.job.title}"</strong> has been updated to: <strong>${data.status}</strong>.</p>
      ${button(`${FRONTEND_URL}/dashboard`, "View Details")}
    `),
  }),

  ASK_FOR_INFO: (data) => ({
    to: data.candidate.email,
    subject: `Information requested for your application - JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">More information needed</h2>
      <p>Hi ${data.candidate.name},</p>
      <p><strong>${data.employer.company_name}</strong> has requested more information regarding your application for <strong>"${data.job.title}"</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;color:#475569;font-style:italic">"${data.message}"</p>
      </div>
      <p>Please respond at your earliest convenience.</p>
      ${button(`${FRONTEND_URL}/dashboard`, "View Application")}
    `),
  }),

  INTERVIEW_INVITE: (data) => {
    const iv = data.interview || {};
    const typeLabel = iv.type === "virtual" ? "Virtual (Online)" : "In-Person";
    const locationLine = iv.type === "virtual" && iv.meeting_link
      ? `<p><strong>Meeting Link:</strong> <a href="${iv.meeting_link}" style="color:#107a57">${iv.meeting_link}</a></p>`
      : iv.location ? `<p><strong>Location:</strong> ${iv.location}</p>` : "";
    return {
      to: data.candidate.email,
      subject: `Interview invitation for "${data.job.title}" - JobsDirect.ie`,
      html: wrapInLayout(`
        <h2 style="color:#0f172a">You've been invited for an interview!</h2>
        <p>Hi ${data.candidate.name},</p>
        <p><strong>${data.employer.company_name}</strong> would like to invite you for an interview for the <strong>"${data.job.title}"</strong> position.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Date:</strong> ${iv.date || "TBC"}</p>
          <p><strong>Time:</strong> ${iv.time || "TBC"}</p>
          <p><strong>Type:</strong> ${typeLabel}</p>
          ${locationLine}
          ${iv.notes ? `<p><strong>Notes:</strong> ${iv.notes}</p>` : ""}
        </div>
        <p>Best of luck with your interview!</p>
        ${button(`${FRONTEND_URL}/dashboard`, "View Details")}
      `),
    };
  },

  DOCUMENTS_REQUESTED: (data) => {
    const docList = (data.documents || []).map(d => `<li><strong>${d.title}</strong>${d.description ? ` — ${d.description}` : ""}</li>`).join("");
    return {
      to: data.employer.email,
      subject: "Documents requested for your account - JobsDirect.ie",
      html: wrapInLayout(`
        <h2 style="color:#0f172a">Documents Required</h2>
        <p>Hi ${data.employer.first_name},</p>
        <p>To complete your employer verification, we need the following documents:</p>
        <ul style="margin:12px 0;padding-left:20px">${docList}</ul>
        <p>Please upload these documents in your employer profile as soon as possible.</p>
        ${button(`${FRONTEND_URL}/dashboard/profile`, "Upload Documents")}
      `),
    };
  },

  EMPLOYER_APPROVED: (data) => ({
    to: data.employer.email,
    subject: "Your employer account is approved - JobsDirect.ie",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Account approved!</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p>Your employer account has been approved. You now have full access to post jobs and manage applications.</p>
      ${button(`${FRONTEND_URL}/dashboard/jobs`, "Post Your First Job")}
    `),
  }),

  EMPLOYER_REJECTED: (data) => ({
    to: data.employer.email,
    subject: "Employer account update - JobsDirect.ie",
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Account verification update</h2>
      <p>Hi ${data.employer.first_name},</p>
      <p>Your employer verification was not approved. Please update your profile and resubmit.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
      ${button(`${FRONTEND_URL}/dashboard/profile`, "Update Profile")}
    `),
  }),

  CONTACT_RECEIVED: (data) => ({
    to: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || "info@jobsdirect.ie",
    subject: `New Contact: ${data.subject}`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">New Contact Message</h2>
      <p><strong>From:</strong> ${data.name} (${data.email})</p>
      ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ""}
      <p><strong>Subject:</strong> ${data.subject}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="white-space:pre-wrap">${data.message}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="color:#666;font-size:12px">Reply directly to ${data.email}</p>
    `),
  }),

  ADMIN_EMPLOYER_VERIFICATION_SUBMITTED: (data) => ({
    to: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || "info@jobsdirect.ie",
    subject: `New Employer Verification Request: ${data.employer.company_name}`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">New Verification Request</h2>
      <p>An employer has submitted their profile for verification:</p>
      <p><strong>Company:</strong> ${data.employer.company_name}</p>
      <p><strong>Employer ID:</strong> ${data.employer.id}</p>
      ${button(`${FRONTEND_URL}/admin`, "Go to Admin Panel")}
    `),
  }),

  TEAM_INVITE: (data) => ({
    to: data.email,
    subject: `You're invited to join ${data.employer.company_name} on JobsDirect.ie`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">Team Invitation</h2>
      <p>You've been invited to join <strong>${data.employer.company_name}</strong> as a <strong>${data.role}</strong> on JobsDirect.ie.</p>
      <p>Click below to create your account and join the team.</p>
      ${button(`${FRONTEND_URL}/join?token=${data.invite_token}`, "Join Team")}
    `),
  }),

  JOB_ALERT_MATCH: (data) => ({
    to: data.user.email,
    subject: `New jobs matching your alert — ${data.alertSummary}`,
    html: wrapInLayout(`
      <h2 style="color:#0f172a">New Jobs Matching Your Alert</h2>
      <p>Hi ${data.user.first_name},</p>
      <p>We found <strong>${data.jobs.length}</strong> new job${data.jobs.length > 1 ? "s" : ""} matching your alert for <strong>${data.alertSummary}</strong>:</p>
      <div style="margin:16px 0">
        ${data.jobs.map((j) => `
          <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px">
            <p style="margin:0;font-weight:600">${j.title}</p>
            <p style="margin:4px 0 0;color:#666;font-size:13px">${j.company_name} · ${j.location}</p>
          </div>
        `).join("")}
      </div>
      ${button(`${FRONTEND_URL}/jobs`, "Browse All Jobs")}
      <p style="color:#666;font-size:12px;margin-top:16px">You can manage your job alerts in your <a href="${FRONTEND_URL}/dashboard/alerts">dashboard</a>.</p>
    `),
  }),
};
