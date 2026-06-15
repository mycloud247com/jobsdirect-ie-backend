/**
 * Utility to find the employer a user belongs to.
 * Supports direct owner (legacy) and team members.
 */
export async function getEmployerForUser(db, user_id) {
  // 1. Check if user is a team member (includes owners)
  const member = await db.EmployerTeamMember.findOne({
    where: { user_id, status: "active" },
    include: [{ model: db.Employer, as: "employer" }]
  });

  if (member) return member.employer;

  // 2. Fallback to direct legacy owner link (if any)
  const employer = await db.Employer.findOne({ where: { user_id } });
  return employer || null;
}

/**
 * Checks if a user has a specific role for an employer.
 * Roles: owner, admin, recruiter
 */
export async function requireRole(db, user_id, employer_id, allowedRoles, errorManager) {
  // Check if global admin
  const user = await db.User.findByPk(user_id);
  if (user?.role === "admin") return;

  // Check team member table
  const member = await db.EmployerTeamMember.findOne({
    where: { employer_id, user_id, status: "active" }
  });

  if (member && allowedRoles.includes(member.role)) return member;

  // Fallback: direct owner (Employer.user_id) — treat as "owner"
  if (allowedRoles.includes("owner")) {
    const employer = await db.Employer.findByPk(employer_id);
    if (employer && employer.user_id === user_id) return;
  }

  throw errorManager.getError("FORBIDDEN", "You do not have permission for this action");
}
