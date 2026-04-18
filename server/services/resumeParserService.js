const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const { parseResume } = require('./resumeParserAgent');

/**
 * Parse PDF file and extract candidate data.
 *
 * Previously used a regex-based skill extractor with 54 hardcoded KNOWN_SKILLS.
 * Now delegates to the LangGraph 4-node agent which:
 *   1. Splits the resume into labelled sections (Section Parser)
 *   2. Infers skills from experience/project bullets with confidence scores (Bullet Analyzer)
 *   3. Merges inferred + listed skills, tags provenance (Skills Reconciler)
 *   4. Validates every skill against the raw text — catches hallucinations (Hallucination Validator)
 *
 * Return shape is unchanged so matchController.js needs no modification.
 * Skills now carry: { name, years, source, confidence, reasoning }
 * Plus a new field: flaggedSkills — skills the LLM couldn't ground in the resume text,
 * each with an actionable advice string for the candidate.
 */
const parseResumePDF = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  const rawText = data.text || '';

  // Run the agent
  const { validatedSkills, flaggedSkills, sections } = await parseResume(rawText);

  // Extract name — best effort from raw text (agent doesn't handle PII)
  const nameMatch =
    rawText.match(/(?:^|\n)\s*(?:name|full name)[\s:]*([^\n]+)/i) ||
    rawText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
  const name = nameMatch ? nameMatch[1].trim() : 'Unknown Candidate';

  // Extract email
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : '';

  // Estimate total experience from education dates or explicit mentions in raw text
  const totalExpMatch =
    rawText.match(/(?:[\d.]+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:experience|exp)/i) ||
    rawText.match(/([\d.]+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:software|development|engineering)/i);
  let totalExperience = 0;
  if (totalExpMatch) {
    const numMatch = totalExpMatch[0].match(/([\d.]+)/);
    if (numMatch) totalExperience = parseFloat(numMatch[1]) || 0;
  }
  // Fallback: average years across skills that have a years value
  if (!totalExperience && validatedSkills.length > 0) {
    const withYears = validatedSkills.filter((s) => s.years && s.years > 0);
    if (withYears.length > 0) {
      totalExperience = withYears.reduce((sum, s) => sum + s.years, 0) / withYears.length;
    }
  }

  return {
    name,
    email,
    skills: validatedSkills,   // Array<{ name, years, source, confidence, reasoning }>
    flaggedSkills,              // Array<{ name, reason, advice }> — new, surfaced to UI
    totalExperience,
    rawText,
    sections,                  // { experience[], projects[], skills[], education[] }
  };
};

module.exports = {
  parseResumePDF,
};
