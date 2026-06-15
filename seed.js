import "dotenv/config";
import bcrypt from "bcrypt";
import DB from "./config/database.js";

async function seed() {
  const db = new DB();
  await db.initiate();
  console.log("Database connected.");

  // ─── 1. Admin Users ───────────────────────────────────────
  console.log("\n[1/4] Seeding users...");
  const users = [
    {
      first_name: "JobsDirect",
      last_name: "Admin",
      email: "admin@jobsdirect.ie",
      password: await bcrypt.hash("Admin123!", 12),
      role: "admin",
      email_verified: true,
    },
    {
      first_name: "Sarah",
      last_name: "Murphy",
      email: "sarah.murphy@lumenlabs.ie",
      password: await bcrypt.hash("Employer123!", 12),
      role: "employer",
      email_verified: true,
    },
    {
      first_name: "Liam",
      last_name: "O'Connor",
      email: "liam.oconnor@gmail.com",
      password: await bcrypt.hash("Employee123!", 12),
      role: "employee",
      email_verified: true,
    },
  ];

  for (const userData of users) {
    await db.User.findOrCreate({
      where: { email: userData.email },
      defaults: userData,
    });
  }
  console.log(`  -> ${users.length} users seeded.`);

  // ─── 2. Employer Profile ──────────────────────────────────
  console.log("\n[2/4] Seeding employer...");
  const employerUser = await db.User.findOne({ where: { email: "sarah.murphy@lumenlabs.ie" } });
  if (employerUser) {
    await db.Employer.findOrCreate({
      where: { user_id: employerUser.id },
      defaults: {
        user_id: employerUser.id,
        company_name: "Lumen Labs",
        phone: "+353 87 555 1111",
        verification_status: "approved",
        approval_submitted_at: new Date(),
        approved_at: new Date(),
      },
    });
  }
  console.log("  -> Employer seeded.");

  // ─── 3. Employee Profile ──────────────────────────────────
  console.log("\n[3/4] Seeding employee...");
  const employeeUser = await db.User.findOne({ where: { email: "liam.oconnor@gmail.com" } });
  if (employeeUser) {
    await db.Employee.findOrCreate({
      where: { user_id: employeeUser.id },
      defaults: {
        user_id: employeeUser.id,
        title: "Frontend Developer",
        phone: "+353 87 555 2222",
        location: "Dublin",
        bio: "React developer with 4 years of experience building polished product experiences.",
        profile_completed: true,
        skills: ["React", "TypeScript", "Tailwind CSS"],
        experience_years: 4,
      },
    });
  }
  console.log("  -> Employee seeded.");

  // ─── 4. Site Settings (full config — single source of truth) ──
  console.log("\n[4/4] Seeding site settings...");
  await db.SiteSetting.findOrCreate({
    where: { key: "site_settings" },
    defaults: {
      key: "site_settings",
      value: {
        auth_required: false,
        brand_name: "JobsDirect.ie",
        brand_accent: "Direct",
        hero_eyebrow: "Ireland's leading job platform",
        hero_title: "Find Your Dream Job or Hire Top Talent",
        hero_highlight: "in Ireland",
        hero_subtitle: "Connect with employers and job seekers across Ireland. Your next opportunity is just a search away.",
        primary_cta: "Search Jobs",
        employer_cta: "Post a Job",
        contact_email: "info@jobsdirect.ie",
        contact_phone: "+353 1 234 5678",
        office_location: "Dublin, Ireland",
        footer_blurb: "Ireland's premier job platform connecting talented professionals with leading employers across the country.",
        featured_jobs_enabled: true,
        employer_approval_required: true,
        job_approval_required: true,
        products: [
          // Listing
          { id: "job_listing", name: "Job Listing", description: "Standard 30-day job listing", type: "listing", credit_cost: 1, stripe_product_id: "prod_UQThsVxVfaPvOw", duration: 30, enabled: true },
          // Add-ons
          { id: "addon_featured", name: "Featured", description: "Show in featured carousel on homepage", type: "addon", credit_cost: 0.5, stripe_product_id: "prod_UQpR6va26ek7eq", icon: "star", appliesTo: "job", enabled: false },
          { id: "addon_highlight", name: "Highlight", description: "Stand out in search results", type: "addon", credit_cost: 5, stripe_product_id: "prod_UQTjviX3572NOe", icon: "sparkles", appliesTo: "job", enabled: true },
          { id: "addon_import", name: "Import from JobsIreland", type: "internal", credit_cost: 0, appliesTo: "job", enabled: true },
          { id: "addon_duplicate", name: "Duplicate Job", type: "internal", credit_cost: 0, appliesTo: "job", enabled: true },
          { id: "addon_urgent", name: "Urgent Hiring", description: "Show urgent hiring tag on listing", type: "addon", credit_cost: 5, stripe_product_id: "prod_URVplG1urXuG30", icon: "alert-triangle", appliesTo: "job", enabled: true },
          // Credit bundles
          { id: "credit_1", name: "1 Credit", description: "1 job listing credit", type: "credit_bundle", credits: 1, stripe_product_id: "prod_UQmyCBpJaQlCih", enabled: true },
          { id: "credit_5", name: "5 Credits", description: "Pay for 4, get 5", type: "credit_bundle", credits: 5, stripe_product_id: "prod_UQUFyUvzYVhPle", enabled: true },
          { id: "credit_10", name: "10 Credits", description: "Pay for 7, get 10", type: "credit_bundle", credits: 10, stripe_product_id: "prod_UQUGjvbTa5pH35", enabled: true },
          // Subscriptions
          // CV Plans (candidate)
          { id: "cv_professional", name: "Professional CV", description: "1 CV with template selection, no watermark", type: "cv_plan", cv_plan_tier: "professional", stripe_product_id: "prod_UREjoeACpGDju0", enabled: true },
          { id: "cv_premium", name: "Premium CV", description: "Up to 4 CVs with all templates, no watermark", type: "cv_plan", cv_plan_tier: "premium", stripe_product_id: "prod_UREjrImZukRkIi", enabled: true },
          // Employer subscriptions
          { id: "cv_db_lite", name: "CV Database Lite", description: "Browse CVs, filter by location/skills/experience, view profiles, download CVs", type: "subscription", stripe_product_id: "prod_UQmuB24xKXN1ET", enabled: true },
          { id: "cv_db_pro", name: "CV Database Pro", description: "All Lite features plus in-platform messaging", type: "subscription", stripe_product_id: "prod_UQUIq75PfheouQ", enabled: true },
        ],
        employer_company_form_config: {
          first_name: { visible: true, required: true },
          last_name: { visible: true, required: true },
          company_name: { visible: true, required: true },
          employer_number: { visible: true, required: true },
          cro_number: { visible: true, required: false },
          phone: { visible: true, required: true },
          website: { visible: true, required: false },
          address_building: { visible: true, required: false },
          address_town: { visible: true, required: false },
          address_county: { visible: true, required: false },
          address_eircode: { visible: true, required: false },
        },
        employer_job_form_config: {
          location: { visible: true, required: true },
          sector: { visible: true, required: false },
          job_type: { visible: true, required: false },
          remote_work_mode: { visible: true, required: false },
          title: { visible: true, required: true },
          description: { visible: true, required: true },
          salary_min: { visible: true, required: false },
          salary_max: { visible: true, required: false },
          salary_period: { visible: true, required: false },
          requirements: { visible: true, required: false },
          application_method: { visible: true, required: false },
          application_url: { visible: false, required: false },
        },
        employee_profile_form_config: {
          first_name: { visible: true, required: true },
          last_name: { visible: true, required: true },
          phone: { visible: true, required: false },
          county: { visible: true, required: false },
          right_to_work: { visible: true, required: false },
          driving_licence: { visible: true, required: false },
          languages: { visible: true, required: false },
          skills: { visible: true, required: false },
          work_experience: { visible: true, required: false },
          education: { visible: true, required: false },
          desired_job_type: { visible: true, required: false },
          desired_location: { visible: true, required: false },
          availability: { visible: true, required: false },
          expected_salary: { visible: true, required: false },
          salary_period: { visible: true, required: false },
          experience_years: { visible: true, required: false },
          is_searchable: { visible: true, required: false },
        },
        employee_candidate_view_config: {
          first_name: { visible: true },
          last_name: { visible: true },
          phone: { visible: false },
          county: { visible: true },
          right_to_work: { visible: true },
          driving_licence: { visible: true },
          languages: { visible: true },
          skills: { visible: true },
          work_experience: { visible: true },
          education: { visible: true },
          desired_job_type: { visible: true },
          desired_location: { visible: true },
          availability: { visible: true },
          expected_salary: { visible: true },
          salary_period: { visible: true },
          experience_years: { visible: true },
          is_searchable: { visible: true },
        },
      },
    },
  });
  console.log("  -> Site settings seeded.");

  console.log("\nSeed complete.");
  await db.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
