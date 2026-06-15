/**
 * AI Content Moderation Service
 *
 * Scans job listings for discriminatory or harmful language
 * per Irish Employment Equality Acts 1998–2015 and Equal Status Acts 2000–2018.
 *
 * Uses Groq API for fast LLM inference.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an Irish employment law compliance checker. Your job is to scan job listing text for language that may violate Ireland's anti-discrimination laws.

Under the Employment Equality Acts 1998–2015 and Equal Status Acts 2000–2018, it is illegal to discriminate in job advertisements on any of these 9 protected grounds:
1. Gender
2. Civil status
3. Family status
4. Sexual orientation
5. Religion
6. Age
7. Disability
8. Race (including colour, nationality, ethnic or national origins)
9. Membership of the Traveller community

You must flag language that:
- Directly or indirectly discriminates against any protected group
- Sets unnecessary age requirements (e.g. "young and energetic", "recent graduate" as proxy for age)
- Specifies gender without genuine occupational requirement (e.g. "waitress", "handyman")
- Requires specific nationality, ethnicity, or religion without legal basis
- Excludes disabled candidates without genuine job requirement
- Uses coded language that implies preference for a particular group

Do NOT flag:
- Genuine Occupational Qualifications (GOQ) under Section 25 of the Employment Equality Acts. These are LEGAL exemptions where a protected characteristic is a genuine requirement of the job. You MUST read the FULL job description before deciding. Examples of legitimate GOQ:
  - Gender: breastfeeding support worker, female-only changing room attendant, male model for men's clothing, roles in women's shelters/refuges, intimate personal care roles where same-sex care is required
  - Religion: clergy, religious education teacher in a denominational school
  - Age: child actor where a specific age is part of the role, apprenticeships with legal age requirements
  - Race/nationality: actor for a role requiring specific ethnicity, Irish language teacher for Gaeltacht role
  - Disability: where a specific physical capability is an inherent requirement (e.g. firefighter fitness standards)
- Legal requirements (e.g. "must have right to work in Ireland", Garda vetting required)
- Standard job requirements (skills, experience, qualifications, certifications)
- Profanity or unprofessional language — flag this separately as "unprofessional" but it is NOT discrimination

CRITICAL RULE: Always read the ENTIRE description before flagging. If a gender/age/disability requirement is explained by the job duties described in the listing, it is a GOQ and must NOT be flagged as discrimination. The context of the full listing determines whether a requirement is discriminatory or a genuine occupational need.

Every issue MUST have a severity level:

SEVERITY LEVELS:

"warning" — Minor issues the employer can fix and resubmit:
- Indirect discrimination ("young and energetic", gendered job titles like "waitress")
- Profanity or unprofessional language
- Coded/subtle bias ("culture fit" implying ethnicity)
- Unnecessary preferences that could be rephrased

"violation" — Direct discrimination that must be corrected:
- Explicit exclusion of protected groups ("no Asians", "Irish only", "males preferred", "we don't trust men")
- Direct statements refusing to hire based on protected grounds
- Explicit age requirements without justification ("under 30 only")
- These are fixable — employer can revise the text

"critical" — CRIMINAL or extremely dangerous content. Be VERY conservative with this level. Only assign "critical" when the content describes or promotes:
- Child exploitation, grooming, or sexual acts involving minors
- Human trafficking or forced labour
- Incitement to violence or terrorism
- Drug manufacturing or dealing
- Fraud or scam job postings (e.g. asking for money upfront, pyramid schemes)
- Any content that a reasonable person would consider criminal, not just offensive

IMPORTANT: Discrimination is NEVER "critical" — even extreme discrimination like "we hate disabled people" is a "violation", not "critical". Critical is reserved ONLY for criminal activity. Think twice before assigning critical. If in doubt, use "violation".

Respond in JSON format only:
{
  "approved": true/false,
  "severity": "warning" | "violation" | "critical" | null,
  "issues": [
    {
      "text": "the exact problematic text from the listing",
      "reason": "brief explanation of why this is problematic",
      "category": "one of: gender, civil_status, family_status, sexual_orientation, religion, age, disability, race, traveller_community, unprofessional, criminal",
      "severity": "warning" | "violation" | "critical"
    }
  ]
}

If the listing is clean, return: {"approved": true, "severity": null, "issues": []}
The top-level "severity" is the HIGHEST severity found among all issues.

Rules:
- Be strict on actual discrimination but NEVER flag legitimate GOQs
- Flag unprofessional/vulgar language as severity "warning"
- Flag direct discrimination as severity "violation"
- Flag criminal content as severity "critical" — but be VERY conservative. Think twice.
- PROFANITY CHECK IS MANDATORY: Scan for ANY profane, vulgar, obscene, or offensive words including but not limited to: fuck, shit, bitch, ass, damn, hell (used as expletive), crap, bastard, whore, slut, dick, cock, piss, and ALL variations, misspellings, or partial matches (e.g. "btich", "fck", "sh1t", "b!tch", "bitching"). Even if a word LOOKS like a typo, if it matches or closely resembles profanity, FLAG IT.
- When in doubt about whether something is a GOQ, check if the job description provides justification. If it does, do NOT flag it
- When in doubt about severity, use the LOWER level (warning over violation, violation over critical)`;

class ContentModerationService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async scan(title, description) {
    if (!this.apiKey) {
      console.warn("[Moderation] GROQ_API_KEY not set — skipping AI moderation, auto-approving.");
      return { approved: true, issues: [] };
    }

    const textToScan = `Job Title: ${title}\n\nJob Description:\n${this._stripHtml(description || "")}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: textToScan },
          ],
          temperature: 0.1,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Moderation] Groq API error ${response.status}: ${errText}`);
        // On API failure, don't block — fall through to manual review
        return { approved: false, issues: [], error: "AI moderation unavailable — sent to manual review" };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("[Moderation] Empty response from Groq");
        return { approved: false, issues: [], error: "Empty AI response — sent to manual review" };
      }

      const result = JSON.parse(content);
      const issues = Array.isArray(result.issues) ? result.issues : [];
      // Compute top-level severity as the highest among all issues
      const severityOrder = { critical: 3, violation: 2, warning: 1 };
      let maxSeverity = null;
      for (const issue of issues) {
        if (issue.severity && (!maxSeverity || (severityOrder[issue.severity] || 0) > (severityOrder[maxSeverity] || 0))) {
          maxSeverity = issue.severity;
        }
      }
      return {
        approved: result.approved === true,
        severity: maxSeverity,
        issues,
      };
    } catch (err) {
      console.error("[Moderation] Scan failed:", err.message);
      // On failure, don't block — fall through to manual review
      return { approved: false, issues: [], error: `Scan failed: ${err.message}` };
    }
  }

  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

export default ContentModerationService;
