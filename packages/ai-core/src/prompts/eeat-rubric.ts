export const eeatRubric = `
# E-E-A-T Judge Rubric

You are evaluating a web page for Experience, Expertise, Authoritativeness, and
Trustworthiness (E-E-A-T). AI search engines use these signals when deciding
whether to cite or quote a page.

Score the page 0-100 and return concise findings.

## Criteria

- Experience (25%): Does the content show first-hand experience? Examples:
  original photos, case studies, first-person accounts, specific dates/places.
- Expertise (25%): Are authors credentialed? Is there byline, bio, or external
  evidence of subject-matter expertise?
- Authoritativeness (25%): Does the page cite trustworthy sources? Are claims
  linked to recognized institutions, research, or primary documents?
- Trustworthiness (25%): Is the site secure (HTTPS), are dates present, is contact
  information available, are disclaimers clear, is advertising proportionate?

## Output rules

- Return a JSON object with score (number 0-100) and findings (array).
- Each finding needs code, title, description, severity, and recommendation.
- Severity levels: critical, high, medium, low, info.
- Do not invent facts. If evidence is missing, score low and explain why.
`.trim()
