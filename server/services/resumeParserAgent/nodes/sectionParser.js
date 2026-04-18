const { ChatOpenAI } = require('@langchain/openai');
const { z } = require('zod');

/**
 * NODE 1 — Section Parser
 *
 * One job: take raw, messy PDF text and split it into labelled sections.
 * Resumes have wildly inconsistent formatting — "Work History", "Experience",
 * "Professional Background" all mean the same thing. The LLM handles that
 * ambiguity so downstream nodes receive clean, structured input.
 *
 * Input state:  { rawText }
 * Output state: { sections }
 */

const sectionsSchema = z.object({
  experience: z
    .array(z.string())
    .describe('All bullet points or descriptions from work experience / employment history sections'),
  projects: z
    .array(z.string())
    .describe('All bullet points or descriptions from academic or personal projects sections'),
  skills: z
    .array(z.string())
    .describe('Skills explicitly listed in a skills or technologies section — raw as written'),
  education: z
    .array(z.string())
    .describe('Education entries including degree, institution, dates'),
});

const sectionParserNode = async (state) => {
  const { rawText } = state;

  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }).withStructuredOutput(sectionsSchema);

  const sections = await llm.invoke([
    {
      role: 'system',
      content: `You are a resume parser. Your only job is to split resume text into labelled sections.

Rules:
- Extract every bullet point and sentence from work experience sections (regardless of what they're named — "Experience", "Work History", "Employment", etc.)
- Extract every bullet point and sentence from project sections ("Projects", "Academic Projects", "Personal Projects", etc.)
- Extract raw skills exactly as listed in skills/technologies sections — do not interpret or expand yet
- Extract education entries as-is
- If a section is absent, return an empty array for that key
- Preserve full bullet text — do not summarise or truncate
- Do not infer or add anything not present in the text`,
    },
    {
      role: 'user',
      content: rawText,
    },
  ]);

  return { sections };
};

module.exports = { sectionParserNode };
