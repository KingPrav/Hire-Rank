const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');

/**
 * NODE 3 — Skills Reconciler
 *
 * Takes two inputs:
 *   1. bulletAnalysis — inferred skills from experience/project bullets (Node 2)
 *   2. sections.skills — skills explicitly listed in the skills section (Node 1)
 *
 * Merges them into a single unified skill list:
 *   - "listed"   → only in skills section, no bullet evidence
 *   - "inferred" → evidenced in bullets, not in skills section
 *   - "both"     → appears in skills section AND evidenced in bullets (highest confidence)
 *
 * The "listed but not evidenced" flag is the honest signal no ATS provides.
 * A candidate who lists Kubernetes but has no bullet demonstrating it
 * gets flagged — they may be padding their resume.
 *
 * Input state:  { sections, bulletAnalysis }
 * Output state: { reconciledSkills }
 */

const reconciledSkillSchema = z.object({
  reconciledSkills: z.array(
    z.object({
      name: z.string().describe('Canonical skill name'),
      years: z.number().nullable().describe('Years of experience if determinable from resume, otherwise null'),
      source: z
        .enum(['listed', 'inferred', 'both'])
        .describe(
          '"listed" = only in skills section. "inferred" = only from bullets. "both" = present in both.'
        ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('1.0 for "both", highest bullet confidence for "inferred", 0.8 for "listed" only'),
      reasoning: z
        .string()
        .nullable()
        .describe('Brief explanation for inferred skills. Null for listed-only skills.'),
    })
  ),
});

const skillsReconcilerNode = async (state) => {
  const { sections, bulletAnalysis } = state;

  // Flatten all inferred skills from every bullet into a single list
  const inferredSkills = (bulletAnalysis || []).flatMap((b) =>
    (b.inferredSkills || []).map((s) => ({
      ...s,
      sourceBullet: b.bullet,
    }))
  );

  // Deduplicate inferred skills by name — keep highest confidence occurrence
  const inferredMap = new Map();
  for (const skill of inferredSkills) {
    const key = skill.name.toLowerCase();
    const existing = inferredMap.get(key);
    if (!existing || skill.confidence > existing.confidence) {
      inferredMap.set(key, skill);
    }
  }

  const listedSkills = sections?.skills || [];

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }).withStructuredOutput(reconciledSkillSchema);

  const result = await llm.invoke([
    {
      role: 'system',
      content: `You are reconciling two skill sources from a resume into a single unified list.

SOURCE A — Explicitly listed skills (from the skills section):
These are skills the candidate wrote down themselves. Treat as valid but unverified — anyone can list anything.

SOURCE B — Inferred skills (from analyzing experience/project bullets):
These are skills demonstrated through actual work described. More reliable signal.

RECONCILIATION RULES:
1. If a skill appears in BOTH sources → source: "both", confidence: 1.0
2. If a skill appears only in SOURCE B (inferred) → source: "inferred", use the bullet's confidence score
3. If a skill appears only in SOURCE A (listed) → source: "listed", confidence: 0.8
4. Normalize skill names to canonical form before comparing (e.g. "reactjs" = "React", "k8s" = "Kubernetes")
5. Do not create duplicate entries for the same skill
6. Estimate years from resume context if available (e.g. job dates, explicit mentions like "3 years of Python"). Use null if not determinable.
7. For "both" skills, use the bullet reasoning if available. For "listed" only, reasoning is null.`,
    },
    {
      role: 'user',
      content: `SOURCE A — Listed skills:
${listedSkills.length ? listedSkills.join(', ') : '(none)'}

SOURCE B — Inferred skills from bullets:
${
  inferredMap.size
    ? Array.from(inferredMap.values())
        .map((s) => `- ${s.name} (confidence: ${s.confidence}, reason: "${s.reasoning}", from: "${s.sourceBullet}")`)
        .join('\n')
    : '(none)'
}

Reconcile these into a single unified skill list.`,
    },
  ]);

  return { reconciledSkills: result.reconciledSkills };
};

module.exports = { skillsReconcilerNode };
