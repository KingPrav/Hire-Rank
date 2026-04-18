const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');

/**
 * Zod schema for structured JD output.
 * LangChain enforces this shape — no manual JSON parsing needed.
 */
const skillSchema = z.object({
  requiredSkills: z
    .array(
      z.object({
        name: z.string().describe('Canonical technical skill name (e.g. React, not ReactJS)'),
        weight: z
          .number()
          .min(1)
          .max(10)
          .describe('Importance 1-10 based on emphasis in JD'),
      })
    )
    .describe('Must-have skills — explicitly required or listed under qualifications'),
  niceToHaveSkills: z
    .array(
      z.object({
        name: z.string().describe('Canonical technical skill name'),
        weight: z
          .number()
          .min(1)
          .max(10)
          .describe('Importance 1-10, typically lower than required'),
      })
    )
    .describe('Preferred or bonus skills — stated as nice-to-have or preferred'),
});

/**
 * Parse a raw job description into weighted required and nice-to-have skill lists.
 * Uses LangChain withStructuredOutput() — returns typed JSON, no regex needed.
 */
const parseJobDescription = async (jdText) => {
  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }).withStructuredOutput(skillSchema);

  const result = await llm.invoke([
    {
      role: 'system',
      content: `You are a technical recruiter extracting skills from job descriptions.
Rules:
- Required skills: explicitly stated as "required", "must have", or in "Qualifications" / "Requirements" sections. Weight 6-10.
- Nice-to-have: stated as "preferred", "bonus", "a plus", or "nice to have". Weight 1-5.
- Only include technical skills: languages, frameworks, databases, cloud tools, DevOps tools.
- Normalize names: "ReactJS" → "React", "k8s" → "Kubernetes", "Postgres" → "PostgreSQL", "Node" → "Node.js".
- Do NOT include soft skills (communication, teamwork, etc.).
- If the JD is vague, infer required vs nice-to-have from context and typical industry norms.`,
    },
    {
      role: 'user',
      content: jdText,
    },
  ]);

  return result;
};

module.exports = { parseJobDescription };
