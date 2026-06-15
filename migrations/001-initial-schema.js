/**
 * Initial schema — creates all tables for JobsDirect.ie
 */
export async function up(qi, Sequelize) {
  // ─── 1. users ──────────────────────────────────────────────
  await qi.sequelize.query(`CREATE TYPE "enum_users_role" AS ENUM ('employee', 'employer', 'admin');`).catch(() => {});
  await qi.sequelize.query(`CREATE TYPE "enum_users_status" AS ENUM ('active', 'suspended');`).catch(() => {});

  await qi.createTable("users", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    first_name: { type: Sequelize.STRING, allowNull: false },
    last_name: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    password: { type: Sequelize.STRING, allowNull: true },
    phone: { type: Sequelize.STRING, allowNull: true },
    role: { type: "enum_users_role", defaultValue: "employee" },
    status: { type: "enum_users_status", defaultValue: "active" },
    email_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
    verification_token: { type: Sequelize.STRING, allowNull: true },
    reset_token: { type: Sequelize.STRING, allowNull: true },
    reset_token_expiry: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 2. employers ─────────────────────────────────────────
  await qi.sequelize.query(`CREATE TYPE "enum_employers_verification_status" AS ENUM ('pending', 'approved', 'rejected');`).catch(() => {});

  await qi.createTable("employers", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    company_name: { type: Sequelize.STRING, allowNull: false },
    phone: { type: Sequelize.STRING, allowNull: true },
    verification_status: { type: "enum_employers_verification_status", defaultValue: "pending" },
    approval_submitted_at: { type: Sequelize.DATE, allowNull: true },
    approved_at: { type: Sequelize.DATE, allowNull: true },
    admin_review_note: { type: Sequelize.TEXT, allowNull: true },
    credits: { type: Sequelize.INTEGER, defaultValue: 0 },
    candidate_database_access: { type: Sequelize.BOOLEAN, defaultValue: false },
    candidate_database_status: { type: Sequelize.STRING, allowNull: true },
    candidate_database_subscription_id: { type: Sequelize.STRING, allowNull: true },
    candidate_database_started_at: { type: Sequelize.DATE, allowNull: true },
    candidate_database_cancelled_at: { type: Sequelize.DATE, allowNull: true },
    stripe_customer_id: { type: Sequelize.STRING, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 3. employees ─────────────────────────────────────────
  await qi.createTable("employees", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    title: { type: Sequelize.STRING, allowNull: true },
    phone: { type: Sequelize.STRING, allowNull: true },
    location: { type: Sequelize.STRING, allowNull: true },
    bio: { type: Sequelize.TEXT, allowNull: true },
    profile_completed: { type: Sequelize.BOOLEAN, defaultValue: false },
    skills: { type: Sequelize.TEXT, allowNull: true },
    experience_years: { type: Sequelize.INTEGER, allowNull: true },
    date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 4. jobs ──────────────────────────────────────────────
  await qi.sequelize.query(`CREATE TYPE "enum_jobs_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');`).catch(() => {});

  await qi.createTable("jobs", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    employer_id: { type: Sequelize.UUID, allowNull: true, references: { model: "employers", key: "id" }, onDelete: "SET NULL" },
    title: { type: Sequelize.STRING, allowNull: false },
    short_description: { type: Sequelize.TEXT, allowNull: true },
    description: { type: Sequelize.TEXT, allowNull: true },
    location: { type: Sequelize.STRING, allowNull: true },
    location_full: { type: Sequelize.STRING, allowNull: true },
    city_town: { type: Sequelize.STRING, allowNull: true },
    country: { type: Sequelize.STRING, defaultValue: "Ireland" },
    job_type: { type: Sequelize.STRING, allowNull: true },
    category: { type: Sequelize.STRING, allowNull: true },
    salary_min: { type: Sequelize.INTEGER, allowNull: true },
    salary_max: { type: Sequelize.INTEGER, allowNull: true },
    salary_period: { type: Sequelize.STRING, allowNull: true },
    salary_type: { type: Sequelize.STRING, allowNull: true },
    benefits: { type: Sequelize.TEXT, allowNull: true },
    company_name: { type: Sequelize.STRING, allowNull: true },
    status: { type: "enum_jobs_status", defaultValue: "pending_review" },
    is_featured: { type: Sequelize.BOOLEAN, defaultValue: false },
    is_highlighted: { type: Sequelize.BOOLEAN, defaultValue: false },
    source: { type: Sequelize.STRING, defaultValue: "manual" },
    source_url: { type: Sequelize.STRING, allowNull: true },
    application_email: { type: Sequelize.STRING, allowNull: true },
    application_method: { type: Sequelize.STRING, allowNull: true },
    application_url: { type: Sequelize.STRING, allowNull: true },
    hours_per_week: { type: Sequelize.FLOAT, allowNull: true },
    positions_count: { type: Sequelize.INTEGER, allowNull: true },
    career_level: { type: Sequelize.STRING, allowNull: true },
    created_by: { type: Sequelize.STRING, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 5. applications ─────────────────────────────────────
  await qi.sequelize.query(`CREATE TYPE "enum_applications_status" AS ENUM ('pending', 'reviewed', 'shortlisted', 'rejected');`).catch(() => {});

  await qi.createTable("applications", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    job_id: { type: Sequelize.UUID, allowNull: false, references: { model: "jobs", key: "id" }, onDelete: "CASCADE" },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    employer_id: { type: Sequelize.UUID, allowNull: true, references: { model: "employers", key: "id" }, onDelete: "SET NULL" },
    status: { type: "enum_applications_status", defaultValue: "pending" },
    cover_letter: { type: Sequelize.TEXT, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 6. contact_messages ──────────────────────────────────
  await qi.sequelize.query(`CREATE TYPE "enum_contact_messages_status" AS ENUM ('new', 'read', 'replied', 'archived');`).catch(() => {});

  await qi.createTable("contact_messages", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false },
    subject: { type: Sequelize.STRING, allowNull: true },
    message: { type: Sequelize.TEXT, allowNull: false },
    status: { type: "enum_contact_messages_status", defaultValue: "new" },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 7. payments ──────────────────────────────────────────
  await qi.createTable("payments", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    employer_id: { type: Sequelize.UUID, allowNull: true, references: { model: "employers", key: "id" }, onDelete: "SET NULL" },
    stripe_session_id: { type: Sequelize.STRING, allowNull: true },
    stripe_customer_id: { type: Sequelize.STRING, allowNull: true },
    stripe_subscription_id: { type: Sequelize.STRING, allowNull: true },
    plan_id: { type: Sequelize.STRING, allowNull: false },
    kind: { type: Sequelize.STRING, allowNull: false },
    credits: { type: Sequelize.INTEGER, defaultValue: 0 },
    amount_total: { type: Sequelize.INTEGER, allowNull: true },
    currency: { type: Sequelize.STRING, defaultValue: "eur" },
    mode: { type: Sequelize.STRING, allowNull: true },
    status: { type: Sequelize.STRING, defaultValue: "checkout_created" },
    payment_status: { type: Sequelize.STRING, allowNull: true },
    checkout_url: { type: Sequelize.TEXT, allowNull: true },
    fulfilled_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 8. site_settings ────────────────────────────────────
  await qi.createTable("site_settings", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    key: { type: Sequelize.STRING, allowNull: false, unique: true },
    value: { type: Sequelize.JSONB, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });

  // ─── 9. page_contents ────────────────────────────────────
  await qi.createTable("page_contents", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    slug: { type: Sequelize.STRING, allowNull: false, unique: true },
    title: { type: Sequelize.STRING, allowNull: true },
    content: { type: Sequelize.TEXT, allowNull: true },
    metadata: { type: Sequelize.JSONB, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
  });
}

export async function down(qi) {
  const tables = [
    "page_contents", "site_settings", "payments", "contact_messages",
    "applications", "jobs", "employees", "employers", "users",
  ];
  for (const table of tables) {
    await qi.dropTable(table, { cascade: true });
  }

  const enums = [
    "enum_users_role", "enum_users_status", "enum_employers_verification_status",
    "enum_jobs_status", "enum_applications_status", "enum_contact_messages_status",
  ];
  for (const e of enums) {
    await qi.sequelize.query(`DROP TYPE IF EXISTS "${e}";`).catch(() => {});
  }
}
