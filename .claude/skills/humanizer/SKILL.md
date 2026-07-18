---
name: humanizer
description: Use when writing or editing client-facing prose (report synthesis text, ai-core prompts, marketing copy) - removes AI-sounding patterns so text reads as human-written
---

# Humanizer — Make geolyt Reports Read as Human-Written

geolyt ships client-facing GEO audit reports written by Gemini synthesis (`packages/ai-core`).
If those reports read as obviously machine-generated, the client trusts the score less. Apply
these rules whenever you write or review: report synthesis prose, synthesis prompts in
`packages/ai-core`, PDF report copy, share-page landing text, or any marketing/UI copy.

Adapted from the blader/humanizer skill (based on Wikipedia's "Signs of AI writing"). The
patterns below are the ones that show up most in scoring commentary and recommendation prose.

## Your Task

1. **Scan** the text (or the prompt you are about to give the model) for the patterns below.
2. **Rewrite, don't delete** — cover everything the original covered. Five points in, five points out.
3. **Preserve the finding** — the score, the evidence, and the recommendation must stay accurate.
4. **Keep the register** — professional consultant tone, not chatty, not breathless.

When editing an `ai-core` prompt, fold these rules into the system instructions so the model
avoids the patterns at generation time instead of relying on a cleanup pass.

## Banned / high-suspicion vocabulary

Cut or replace on sight when they cluster: `delve`, `leverage`, `landscape` (figurative),
`tapestry`, `testament`, `underscore`, `showcase`, `pivotal`, `crucial`, `vibrant`, `robust`,
`seamless`, `unlock`, `elevate`, `empower`, `harness`, `realm`, `intricate`, `foster`,
`enhance`, `garner`, `in today's digital age`, `in the ever-evolving world of`,
`when it comes to`, `it's worth noting that`.

These are fine in isolation; a paragraph with three of them is a tell.

## Patterns to fix (with report-specific examples)

### 1. Promotional / breathless tone
A report is an assessment, not an ad. State the finding flatly.
- Before: "Your site boasts a robust content strategy and a vibrant, engaging presence that truly showcases your brand."
- After: "The site has strong topical content. Product pages rank well, but comparison and FAQ pages are thin."

### 2. Rule of three
LLMs force ideas into triplets to sound thorough.
- Before: "AI engines reward clarity, structure, and authority."
- After: "AI engines cite pages that answer a question directly and show where the claim comes from."

### 3. "It's not just X, it's Y" / negative parallelism
- Before: "This isn't just about ranking — it's about being the answer AI models trust."
- After: "The goal is to be the source an AI model quotes, not only to rank in classic search."

### 4. Superficial "-ing" tails that fake depth
- Before: "Your schema markup is incomplete, limiting your visibility and hindering how AI models parse your content, ultimately reducing citations."
- After: "Schema markup is incomplete. Without it, models like Gemini and Perplexity have a harder time extracting your facts, so you get cited less."

### 5. Vague authority / weasel attribution
Cite the actual signal geolyt measured, not an invented consensus.
- Before: "Experts agree that structured data is critical for generative engines."
- After: "Pages with FAQ and Article schema were cited in 3 of the 5 AI answers we tested; your pages without schema were cited in 0."

### 6. Copula avoidance (dressing up "is")
- Before: "Your llms.txt file serves as a critical gateway that empowers AI crawlers."
- After: "Your llms.txt file tells AI crawlers which pages to prioritize. You don't have one yet."

### 7. Manufactured punchlines / staccato drama
- Before: "Then the AI checked your site. No schema. No llms.txt. No clear answers. Nothing to cite."
- After: "When we ran the audit, the crawler found no schema, no llms.txt, and few direct answers, so there was little for a model to quote."

### 8. Aphorism formulas
- Before: "In the age of AI search, citations are the new currency of trust."
- After: "AI assistants increasingly answer questions by quoting sources. Being one of those sources drives referral traffic."

### 9. False ranges
- Before: "From metadata to mission statements, every part of your site shapes AI perception."
- After: "Your metadata and your core product descriptions are the two areas most affecting how AI models describe you."

### 10. Sycophantic openers
Reports should not flatter the client before delivering findings.
- Before: "Great question! Your website has a fantastic foundation to build on."
- After: "Overall GEO score: 62/100. The main gaps are structured data and answer-first content."

## Em dashes: cut them

The em dash (—) and en dash (–) are among the most reliable AI tells. The final report text
should contain none. Replace each, in rough order of preference: a period, a comma, a colon,
or parentheses. Also catch spaced em dashes (` — `) and double hyphens (` -- `).
Before returning text, scan for `—` and `–`; any hit means it isn't done.

## What NOT to flag (false positives)

- Clean grammar and consistent style. Polish is not a tell.
- One `however` / `additionally`. Only piled-up transitions are AI-coded.
- A single em dash in a human-provided quote, testimonial, or client name — leave quoted text alone.
- Formal vocabulary that isn't on the banned list. Don't flatten "canonical" or "crawler."
- Real numbers and scores. Specificity is the opposite of the problem; keep every metric.

Look for clusters, not isolated hits. A single "crucial" means nothing; "crucial" plus a
rule-of-three plus "vibrant tapestry" plus a breathless close is a confession.

## Process

1. Identify every instance of the patterns above.
2. Write a draft rewrite that reads naturally aloud, varies sentence length, and keeps the
   concrete GEO findings (scores, cited pages, missing schema) intact.
3. Ask: "What still makes this sound AI-generated?" Answer with any remaining tells.
4. Produce a final version that fixes them and contains no em or en dashes.

For `packages/ai-core` prompts, add a short instruction block to the system prompt: forbid the
banned vocabulary, forbid em dashes, forbid rule-of-three and "it's not just X, it's Y", and
require the model to state each finding with the specific metric behind it.
