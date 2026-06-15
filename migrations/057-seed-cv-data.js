import crypto from "crypto";
const uuid = () => crypto.randomUUID();

export async function up(qi) {
  const userId = 'ed5326dd-a249-41ce-b25a-c921e88f3246';

  // Update existing CV with content
  const [cvs] = await qi.sequelize.query(`SELECT id FROM cvs WHERE user_id = '${userId}' LIMIT 1`);
  if (cvs.length) {
    const cvId = cvs[0].id;
    const workExp = JSON.stringify([
      {
        job_title: "Senior Software Engineer",
        company: "Lumen Labs Ltd",
        location: "Dublin, Ireland",
        start_date: "2022-03-01",
        end_date: "",
        current: true,
        responsibilities: "Lead frontend development for SaaS platform using React, TypeScript, and Tailwind CSS. Architected component library used across 3 products. Mentored 2 junior developers. Reduced page load times by 40% through code splitting and lazy loading."
      },
      {
        job_title: "Full Stack Developer",
        company: "Digital Wave Agency",
        location: "Cork, Ireland",
        start_date: "2019-06-01",
        end_date: "2022-02-28",
        current: false,
        responsibilities: "Built web applications for 15+ clients using React, Node.js, and PostgreSQL. Implemented CI/CD pipelines with GitHub Actions. Led migration from monolith to microservices architecture."
      },
      {
        job_title: "Junior Developer",
        company: "TechStart Ireland",
        location: "Galway, Ireland",
        start_date: "2017-09-01",
        end_date: "2019-05-31",
        current: false,
        responsibilities: "Developed features for e-commerce platform. Wrote unit and integration tests. Participated in agile sprints and code reviews."
      }
    ]);

    const education = JSON.stringify([
      {
        degree: "BSc (Hons) Computer Science",
        institution: "University College Dublin",
        field_of_study: "Computer Science",
        start_date: "2013-09-01",
        end_date: "2017-06-01"
      },
      {
        degree: "Leaving Certificate",
        institution: "St. Patrick's CBS",
        field_of_study: "Science & Mathematics",
        start_date: "2011-09-01",
        end_date: "2013-06-01"
      }
    ]);

    await qi.sequelize.query(`UPDATE cvs SET
      name = 'Software Engineer CV',
      title = 'Senior Software Engineer',
      bio = 'Experienced full-stack developer with 7+ years building production web applications. Specialising in React, TypeScript, Node.js, and cloud infrastructure. Passionate about clean code, performance optimisation, and mentoring junior developers.',
      skills = 'React, TypeScript, Node.js, PostgreSQL, Tailwind CSS, AWS, Docker, Git, CI/CD, REST APIs, GraphQL, Redis, Agile/Scrum',
      work_experience = '${workExp.replace(/'/g, "''")}'::jsonb,
      education = '${education.replace(/'/g, "''")}'::jsonb,
      type = 'generated_free',
      template_id = 'basic',
      updated_at = NOW()
    WHERE id = '${cvId}'`);
  }

  // Create a second CV tailored for management roles
  const cv2Id = uuid();
  const workExp2 = JSON.stringify([
    {
      job_title: "Engineering Team Lead",
      company: "Lumen Labs Ltd",
      location: "Dublin, Ireland",
      start_date: "2023-01-01",
      end_date: "",
      current: true,
      responsibilities: "Leading a team of 5 engineers delivering the core product platform. Conducting 1:1s, sprint planning, and architecture reviews. Driving technical strategy and hiring decisions."
    },
    {
      job_title: "Senior Software Engineer",
      company: "Lumen Labs Ltd",
      location: "Dublin, Ireland",
      start_date: "2022-03-01",
      end_date: "2022-12-31",
      current: false,
      responsibilities: "Led frontend development for SaaS platform. Architected component library. Mentored junior developers."
    },
    {
      job_title: "Full Stack Developer",
      company: "Digital Wave Agency",
      location: "Cork, Ireland",
      start_date: "2019-06-01",
      end_date: "2022-02-28",
      current: false,
      responsibilities: "Built web applications for clients. Led migration to microservices. Managed client relationships and project timelines."
    }
  ]);

  const education2 = JSON.stringify([
    {
      degree: "BSc (Hons) Computer Science",
      institution: "University College Dublin",
      field_of_study: "Computer Science",
      start_date: "2013-09-01",
      end_date: "2017-06-01"
    }
  ]);

  await qi.sequelize.query(`INSERT INTO cvs (id, user_id, name, type, template_id, is_default, title, bio, skills, work_experience, education, created_at, updated_at) VALUES (
    '${cv2Id}', '${userId}', 'Team Lead CV', 'generated_free', 'basic', false,
    'Engineering Team Lead',
    'Technical leader with 7+ years in software engineering and 2+ years managing engineering teams. Track record of delivering complex products on time, growing teams, and driving technical excellence. Strong communicator bridging business and engineering.',
    'Team Leadership, Agile/Scrum, Technical Architecture, React, TypeScript, Node.js, Hiring, Mentoring, Stakeholder Management, OKRs',
    '${workExp2.replace(/'/g, "''")}'::jsonb,
    '${education2.replace(/'/g, "''")}'::jsonb,
    NOW(), NOW()
  )`);

  // Also update the employee profile with basic info
  await qi.sequelize.query(`UPDATE employees SET
    phone = '+353 87 999 8888',
    county = 'Dublin',
    right_to_work = 'irish_citizen',
    driving_licence = 'full_b',
    languages = 'English, Urdu'
  WHERE user_id = '${userId}'`);
}

export async function down() {}
