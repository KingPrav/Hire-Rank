const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');

/**
 * NODE 4 — Hallucination Validator
 *
 * The final quality gate. Goes back to the original raw resume text and
 * checks every reconciled skill against it. Simple question for each skill:
 * "Is there ANY text in this resume that could justify this skill being here?"
 *
 * Skills that pass → validatedSkills (safe to use in scoring)
 * Skills that fail → flaggedSkills (surfaced to the user as actionable advice:
 *   "We couldn't find evidence of X in your resume — consider adding a bullet
 *    that demonstrates it.")
 *
 * This is what separates the tool from commercial ATS systems.
 * No ATS tells candidates WHY they failed a parse — this one does.
 *
 * Input state:  { rawText, reconciledSkills }
 * Output state: { validatedSkills, flaggedSkills }
 */

const validationSchema = z.object({
  validatedSkills: z.array(
    z.object({
      name: z.string(),
      years: z.number().nullable(),
      source: z.string(),
      confidence: z.number(),
      reasoning: z.string().nullable(),
    })
  ),
  flaggedSkills: z.array(
    z.object({
      name: z.string(),
      reason: z.string().describe('Why this skill could not be validated against the resume text'),
      advice: z
        .string()
        .describe('Specific actionable advice for the candidate on how to fix this in their resume'),
    })
  ),
});

const hallucinationValidatorNode = async (state) => {
  const { rawText, reconciledSkills } = state;

  if (!reconciledSkills || reconciledSkills.length === 0) {
    return { validatedSkills: [], flaggedSkills: [] };
  }

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }).withStructuredOutput(validationSchema);

  const result = await llm.invoke([
    {
      role: 'system',
      content: `You are a validation agent. Your job is to check whether each skill in a list can be grounded in a resume's actual text.

For each skill, read the original resume text and decide:

VALIDATE if ANY of these are true:
- The skill name (or a clear synonym/alias) appears anywhere in the resume text
- A bullet point describes work that directly demonstrates this skill
- The skill is listed in the skills section

FLAG if ALL of these are true:
- The skill name does not appear in the resume text
- No bullet point describes work that evidences this skill
- The reasoning provided is speculative rather than grounded

For flagged skills, write:
- reason: why you couldn't find evidence (be specific — "Neither 'Kubernetes' nor 'k8s' appears in the resume, and no bullet describes container orchestration")
- advice: a specific, actionable suggestion for the candidate ("Add a bullet to your Pinnacle Seven experience mentioning the specific tool used for deployment orchestration, e.g. 'Managed Kubernetes clusters...'")

Be conservative on flagging — only flag if you are confident there is no grounding. When in doubt, validate.`,
    },
    {
      role: 'user',
      content: `RESUME TEXT:
${rawText}

---

SKILLS TO VALIDATE:
${reconciledSkills
  .map(
    (s) =>
      `- ${s.name} (source: ${s.source}, confidence: ${s.confidence}${s.reasoning ? `, reasoning: "${s.reasoning}"` : ''})`
  )
  .join('\n')}

Validate each skill against the resume text.`,
    },
  ]);

  return {
    validatedSkills: result.validatedSkills,
    flaggedSkills: result.flaggedSkills,
  };
};

module.exports = { hallucinationValidatorNode };
