const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');

/**
 * NODE 2 — Bullet Analyzer
 *
 * This is the core intelligence of the agent. It receives only experience
 * and project bullets — NOT the skills section — and infers what technical
 * skills are demonstrated by the work described.
 *
 * The key insight: candidates who write "reduced P99 latency by 40% through
 * query optimization" are demonstrating database proficiency even if they
 * never wrote the word "PostgreSQL". This node catches that.
 *
 * Every inference must have a reasoning string. No reasoning = no skill.
 * This is what enables the hallucination validator in Node 4.
 *
 * Input state:  { sections }
 * Output state: { bulletAnalysis }
 */

const inferredSkillSchema = z.object({
  name: z.string().describe('Canonical skill name (e.g. "PostgreSQL", not "database")'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('0.0–1.0. Explicit mention = 0.9+. Strong implication = 0.6–0.8. Weak implication = below 0.6'),
  reasoning: z
    .string()
    .describe('One sentence explaining exactly why this skill was inferred from the bullet text'),
});

const bulletAnalysisSchema = z.object({
  analyses: z.array(
    z.object({
      bullet: z.string().describe('The original bullet point text'),
      inferredSkills: z
        .array(inferredSkillSchema)
        .describe('Skills directly evidenced or strongly implied by this specific bullet'),
    })
  ),
});

const bulletAnalyzerNode = async (state) => {
  const { sections } = state;

  // Combine experience and project bullets — both carry evidence of skills
  const allBullets = [
    ...(sections.experience || []),
    ...(sections.projects || []),
  ];

  if (allBullets.length === 0) {
    return { bulletAnalysis: [] };
  }

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }).withStructuredOutput(bulletAnalysisSchema);

  const result = await llm.invoke([
    {
      role: 'system',
      content: `You are a senior software engineering hiring manager analyzing resume bullets to infer technical skills.

Your task: for each bullet point, identify what technical skills the candidate has demonstrated — based on what they actually DID, not just what keywords appear.

CONFIDENCE SCORING:
- 0.95: Skill is explicitly named AND the work described confirms real usage ("built REST APIs with Express.js")
- 0.85: Skill is explicitly named but context is shallow ("used Docker")
- 0.70: Skill is strongly implied by the work described ("orchestrated containerised deployments across 4 environments" → Kubernetes likely)
- 0.55: Skill is reasonably implied but could be multiple tools ("optimized slow database queries" → SQL likely, specific DB unknown)
- Below 0.5: Do not include — too speculative

INFERENCE RULES:
- Only infer skills that are directly evidenced by the specific action described
- "Reduced API latency by 40% through indexing" → PostgreSQL/MySQL: 0.6 (relational DB implied), NOT Redis, NOT MongoDB
- "Deployed containerised services to production" → Docker: 0.9, Kubernetes: 0.7 if scale implied, NOT Terraform
- "Built CI/CD pipelines" → CI/CD: 0.9. Infer Jenkins/GitHub Actions/CircleCI only if named
- "Implemented real-time monitoring" → Prometheus: 0.5 unless named, Grafana: 0.5 unless named
- "Developed REST APIs" → REST APIs: 0.95, Express.js: 0.6 if Node.js context exists
- NEVER infer a skill just because it's commonly used alongside something else

NAMING:
- Use canonical names: "Node.js" not "node", "PostgreSQL" not "postgres", "Kubernetes" not "k8s"
- Skills must be technical: languages, frameworks, databases, cloud services, DevOps tools
- Do NOT include soft skills, methodologies without tools (e.g. "agile" alone), or vague terms like "backend development"

If a bullet provides no evidence of a specific technical skill, return an empty inferredSkills array for it.`,
    },
    {
      role: 'user',
      content: `Analyze these resume bullets:\n\n${allBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
    },
  ]);

  return { bulletAnalysis: result.analyses };
};

module.exports = { bulletAnalyzerNode };
