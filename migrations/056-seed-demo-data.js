import bcrypt from "bcrypt";
import crypto from "crypto";

const hash = (pw) => bcrypt.hashSync(pw, 12);
const uuid = () => crypto.randomUUID();

export async function up(qi) {
  // ── Employers ──
  const emp1UserId = uuid(), emp2UserId = uuid(), emp3UserId = uuid();
  const emp1Id = uuid(), emp2Id = uuid(), emp3Id = uuid();
  const cand1Id = uuid(), cand2Id = uuid(), cand3Id = uuid();
  const cand1EmpId = uuid(), cand2EmpId = uuid(), cand3EmpId = uuid();

  // Employer users
  await qi.sequelize.query(`INSERT INTO users (id, first_name, last_name, email, password, role, email_verified, status, created_at, updated_at) VALUES
    ('${emp1UserId}', 'Sarah', 'Murphy', 'sarah@lumenlabs.ie', '${hash("Demo1234!")}', 'employer', true, 'active', NOW(), NOW()),
    ('${emp2UserId}', 'James', 'O''Brien', 'james@threesteps.ie', '${hash("Demo1234!")}', 'employer', true, 'active', NOW(), NOW()),
    ('${emp3UserId}', 'Aoife', 'Kelly', 'aoife@greenfield.ie', '${hash("Demo1234!")}', 'employer', true, 'active', NOW(), NOW())
  `);

  // Employers
  await qi.sequelize.query(`INSERT INTO employers (id, user_id, first_name, last_name, company_name, cro_number, employer_number, phone, website, business_address, verification_status, credits, created_at, updated_at) VALUES
    ('${emp1Id}', '${emp1UserId}', 'Sarah', 'Murphy', 'Lumen Labs Ltd', '654321', 'EMP-LL-001', '+353 1 234 5678', 'https://lumenlabs.ie', 'Unit 5, Digital Hub, Dublin 8', 'approved', 25, NOW(), NOW()),
    ('${emp2Id}', '${emp2UserId}', 'James', 'O''Brien', 'Three Steps Care Services', '789012', 'EMP-TS-002', '+353 46 123 456', 'https://threesteps.ie', '15 Main Street, Navan, Co. Meath', 'approved', 10, NOW(), NOW()),
    ('${emp3Id}', '${emp3UserId}', 'Aoife', 'Kelly', 'Greenfield Hospitality Group', '345678', 'EMP-GF-003', '+353 21 456 789', 'https://greenfield.ie', '22 Patrick Street, Cork', 'approved', 15, NOW(), NOW())
  `);

  // Team members (owners)
  await qi.sequelize.query(`INSERT INTO employer_team_members (id, employer_id, user_id, email, role, status, accepted_at, created_at, updated_at) VALUES
    ('${uuid()}', '${emp1Id}', '${emp1UserId}', 'sarah@lumenlabs.ie', 'owner', 'active', NOW(), NOW(), NOW()),
    ('${uuid()}', '${emp2Id}', '${emp2UserId}', 'james@threesteps.ie', 'owner', 'active', NOW(), NOW(), NOW()),
    ('${uuid()}', '${emp3Id}', '${emp3UserId}', 'aoife@greenfield.ie', 'owner', 'active', NOW(), NOW(), NOW())
  `);

  // ── Candidates ──
  await qi.sequelize.query(`INSERT INTO users (id, first_name, last_name, email, password, role, email_verified, status, created_at, updated_at) VALUES
    ('${cand1Id}', 'Liam', 'O''Connor', 'liam.oconnor@gmail.com', '${hash("Demo1234!")}', 'employee', true, 'active', NOW(), NOW()),
    ('${cand2Id}', 'Emma', 'Walsh', 'emma.walsh@outlook.com', '${hash("Demo1234!")}', 'employee', true, 'active', NOW(), NOW()),
    ('${cand3Id}', 'Ciaran', 'Byrne', 'ciaran.byrne@yahoo.com', '${hash("Demo1234!")}', 'employee', true, 'active', NOW(), NOW())
  `);

  await qi.sequelize.query(`INSERT INTO employees (id, user_id, first_name, last_name, phone, county, right_to_work, driving_licence, languages, skills, experience_years, availability, desired_job_type, desired_location, created_at, updated_at) VALUES
    ('${cand1EmpId}', '${cand1Id}', 'Liam', 'O''Connor', '+353 87 111 2222', 'Dublin', 'irish_citizen', 'full_b', 'English, Irish', '["React","TypeScript","Node.js","PostgreSQL","Tailwind CSS"]', 5, 'immediately', 'full_time', 'Dublin', NOW(), NOW()),
    ('${cand2EmpId}', '${cand2Id}', 'Emma', 'Walsh', '+353 86 333 4444', 'Cork', 'eu_citizen', 'full_b', 'English, French', '["Social Care","First Aid","Child Protection","Crisis Intervention"]', 3, '2_weeks', 'full_time', 'Cork', NOW(), NOW()),
    ('${cand3EmpId}', '${cand3Id}', 'Ciaran', 'Byrne', '+353 85 555 6666', 'Meath', 'irish_citizen', 'full_c', 'English', '["Hospitality","Customer Service","Food Safety","Team Management"]', 7, 'negotiable', 'full_time', 'Meath', NOW(), NOW())
  `);

  // ── Jobs ──
  const jobs = [
    { id: uuid(), emp: emp1Id, title: "Senior Frontend Developer", company: "Lumen Labs Ltd", location: "Dublin", sector: "it", job_type: "full_time", remote: "hybrid", salMin: 65000, salMax: 85000, desc: "We are looking for an experienced Frontend Developer to join our product team. You will work on building modern, responsive web applications using React, TypeScript, and Tailwind CSS. Our stack includes Node.js microservices, PostgreSQL, and Redis. You will collaborate closely with designers and backend engineers to deliver pixel-perfect, performant user interfaces.\n\nRequirements:\n- 4+ years of React/TypeScript experience\n- Strong CSS and responsive design skills\n- Experience with REST APIs and state management\n- Git workflow and CI/CD familiarity\n\nBenefits:\n- Flexible hybrid working (2 days office, 3 remote)\n- Health insurance\n- Annual learning budget of €2,000\n- 25 days annual leave" },
    { id: uuid(), emp: emp1Id, title: "DevOps Engineer", company: "Lumen Labs Ltd", location: "Dublin", sector: "it", job_type: "full_time", remote: "remote", salMin: 70000, salMax: 90000, desc: "Join our infrastructure team to build and maintain cloud-native deployment pipelines. You will manage AWS infrastructure, implement monitoring solutions, and ensure 99.9% uptime for our production services.\n\nRequirements:\n- 3+ years DevOps/SRE experience\n- AWS (EC2, ECS, Lambda, RDS)\n- Terraform and Docker\n- CI/CD pipelines (GitHub Actions)\n- Linux administration\n\nBenefits:\n- Fully remote position\n- €2,500 home office budget\n- Stock options\n- 25 days annual leave" },
    { id: uuid(), emp: emp2Id, title: "Social Care Worker", company: "Three Steps Care Services", location: "Meath", sector: "social_care", job_type: "full_time", remote: "on_site", salMin: 39000, salMax: 43800, desc: "Three Steps is a trauma and attachment informed, clinically supported residential care service provider. We work closely with the HSE, Tusla (Child and Family Agency) and the Northern Ireland Trusts.\n\nWe are seeking qualified Social Care Workers to join our teams in Co. Meath. Our care team members work with all our partners to provide safe, compassionate, and professionally informed care to the children, young people and adults placed in our centres.\n\nRequirements:\n- Level 7 qualification in Social Care or relevant field\n- Ability to care for vulnerable children and young people\n- Full clean manual driving licence\n- Flexible regarding working hours\n- Fluent in written and spoken English\n\nBenefits:\n- Comprehensive training programme\n- Strong team support structures\n- 3 weeks paid sick leave\n- Enhanced annual leave for long-serving members\n- Onsite parking" },
    { id: uuid(), emp: emp2Id, title: "Deputy Manager — Residential Care", company: "Three Steps Care Services", location: "Meath", sector: "social_care", job_type: "full_time", remote: "on_site", salMin: 48000, salMax: 55000, desc: "We are looking for an experienced Deputy Manager to support the Centre Manager in the day-to-day running of one of our residential care centres in Co. Meath.\n\nYou will lead a team of Social Care Workers, ensure compliance with HIQA standards, and maintain a safe, nurturing environment for young people in care.\n\nRequirements:\n- Level 8 degree in Social Care or equivalent\n- Minimum 3 years experience in residential care\n- Leadership and team management skills\n- Knowledge of Children First guidelines\n- Full clean driving licence\n\nBenefits:\n- Salary €48,000 – €55,000\n- Pension contribution\n- Professional development support\n- 25 days annual leave" },
    { id: uuid(), emp: emp3Id, title: "Head Chef", company: "Greenfield Hospitality Group", location: "Cork", sector: "hospitality", job_type: "full_time", remote: "on_site", salMin: 45000, salMax: 55000, desc: "Greenfield Hospitality Group is seeking a talented Head Chef to lead our kitchen team at our flagship restaurant in Cork city centre.\n\nYou will be responsible for menu development, food cost management, kitchen operations, and maintaining the highest standards of food quality and hygiene.\n\nRequirements:\n- 5+ years of professional kitchen experience\n- Culinary arts qualification\n- Strong leadership and organisational skills\n- HACCP certification\n- Passion for Irish seasonal ingredients\n\nBenefits:\n- Competitive salary €45,000 – €55,000\n- Staff meals on duty\n- Discounts across our properties\n- Career progression opportunities\n- Tips shared equally" },
    { id: uuid(), emp: emp3Id, title: "Hotel Receptionist", company: "Greenfield Hospitality Group", location: "Cork", sector: "hospitality", job_type: "part_time", remote: "on_site", salMin: 26000, salMax: 30000, desc: "We are looking for a friendly, professional Hotel Receptionist to join our front desk team. You will be the first point of contact for guests, handling check-ins, reservations, and enquiries.\n\nRequirements:\n- Previous reception or customer service experience\n- Excellent communication skills\n- Proficiency with booking systems (Opera/Fidelio a plus)\n- Flexible availability including weekends\n- Right to work in Ireland\n\nBenefits:\n- Part-time hours (20-30 per week)\n- Staff accommodation available\n- Free parking\n- Training and development" },
    { id: uuid(), emp: emp1Id, title: "UX/UI Designer", company: "Lumen Labs Ltd", location: "Dublin", sector: "it", job_type: "contract", remote: "hybrid", salMin: 55000, salMax: 70000, desc: "We need a creative UX/UI Designer for a 12-month contract to lead the redesign of our core product. You will conduct user research, create wireframes and prototypes, and work with developers to implement designs.\n\nRequirements:\n- 3+ years UX/UI design experience\n- Proficiency in Figma\n- Understanding of accessibility standards\n- Portfolio demonstrating user-centred design process\n- Experience with design systems\n\nBenefits:\n- 12-month initial contract (extension likely)\n- Hybrid working\n- Modern office in Digital Hub\n- Collaborative team environment" },
    { id: uuid(), emp: emp3Id, title: "Restaurant Manager", company: "Greenfield Hospitality Group", location: "Galway", sector: "hospitality", job_type: "full_time", remote: "on_site", salMin: 40000, salMax: 48000, desc: "We are expanding to Galway and looking for an experienced Restaurant Manager to open and run our new location. You will hire and train staff, manage daily operations, and ensure exceptional customer service.\n\nRequirements:\n- 3+ years restaurant management experience\n- Strong people management skills\n- P&L management experience\n- Wine and food knowledge\n- Full driving licence\n\nBenefits:\n- Salary €40,000 – €48,000 + performance bonus\n- Relocation assistance available\n- Health insurance\n- Career growth into regional management" },
  ];

  for (const j of jobs) {
    const slug = `${j.title.toLowerCase().replace(/[^a-z0-9\\s-]/g, "").replace(/\\s+/g, "-").replace(/-+/g, "-").slice(0, 50)}-${j.id.slice(0, 6)}`;
    await qi.sequelize.query(`INSERT INTO jobs (id, employer_id, title, description, company_name, location, sector, job_type, remote_work_mode, salary_min, salary_max, salary_period, status, listing_type, listing_duration, slug, approved_at, expires_at, application_method, created_by, created_at, updated_at) VALUES
      ('${j.id}', '${j.emp}', '${j.title.replace(/'/g, "''")}', '${j.desc.replace(/'/g, "''")}', '${j.company.replace(/'/g, "''")}', '${j.location}', '${j.sector}', '${j.job_type}', '${j.remote}', ${j.salMin}, ${j.salMax}, 'annual', 'approved', 'paid', 30, '${slug}', NOW(), NOW() + INTERVAL '30 days', 'platform', 'demo@jobsdirect.ie', NOW() - INTERVAL '${Math.floor(Math.random() * 14)}  days', NOW())
    `);
  }

  // ── Applications ──
  const appJobs = jobs.slice(0, 4);
  const candidates = [
    { userId: cand1Id, name: "Liam O'Connor", email: "liam.oconnor@gmail.com" },
    { userId: cand2Id, name: "Emma Walsh", email: "emma.walsh@outlook.com" },
    { userId: cand3Id, name: "Ciaran Byrne", email: "ciaran.byrne@yahoo.com" },
  ];

  for (let i = 0; i < appJobs.length; i++) {
    const cand = candidates[i % candidates.length];
    const j = appJobs[i];
    const emp = j.emp;
    await qi.sequelize.query(`INSERT INTO applications (id, job_id, user_id, employer_id, status, cover_letter, is_guest, created_at, updated_at) VALUES
      ('${uuid()}', '${j.id}', '${cand.userId}', '${emp}', 'submitted', 'I am very interested in this role and believe my experience makes me an excellent fit. I look forward to hearing from you.', false, NOW(), NOW())
    `);
  }
}

export async function down() {}
