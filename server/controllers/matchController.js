const fs = require('fs').promises;
const { parseResumePDF } = require('../services/resumeParserService');
const { parseJobDescription } = require('../services/jdParserService');
const { calculateCandidateScore } = require('../services/scoringService');
const { normalizeSkill } = require('../utils/skillNormalizer');
const { ChatOpenAI } = require('@langchain/openai');

/**
 * POST /api/match
 * Body: multipart/form-data — resume (PDF file) + jobDescription (text)
 * Returns: score, matchPercent, matched/missing skills, LLM explanation
 */
const analyzeMatch = async (req, res) => {
  const file = req.file;
  const { jobDescription } = req.body;

  if (!file) return res.status(400).json({ error: 'Resume PDF is required.' });
  if (!jobDescription?.trim()) return res.status(400).json({ error: 'Job description is required.' });

  try {
    // 1. Parse the uploaded resume PDF → extract skills + experience
    const parsed = await parseResumePDF(file.path);

    // 2. Parse the JD with LangChain → get weighted required + nice-to-have skills
    const { requiredSkills, niceToHaveSkills } = await parseJobDescription(jobDescription);

    // 3. Run the existing scoring engine against the parsed candidate
    const job = { requiredSkills, niceToHaveSkills };
    const candidate = { skills: parsed.skills };
    const { score, matchPercent, matchedRequired: matchedCount, requiredCount } = calculateCandidateScore(candidate, job);

    // 4. Identify which specific skills matched and which are missing
    //    Build a normalized set of the candidate's skills for fast lookup
    const candidateSkillSet = new Set(
      parsed.skills.map((s) => normalizeSkill(s.name)?.toLowerCase()).filter(Boolean)
    );

    const skillMatches = (skillList) =>
      skillList.filter((s) => {
        const normalized = normalizeSkill(s.name)?.toLowerCase();
        return normalized && candidateSkillSet.has(normalized);
      });

    const skillMissing = (skillList) =>
      skillList.filter((s) => {
        const normalized = normalizeSkill(s.name)?.toLowerCase();
        return !normalized || !candidateSkillSet.has(normalized);
      });

    const matchedRequired = skillMatches(requiredSkills).map((s) => s.name);
    const missingRequired = skillMissing(requiredSkills).map((s) => s.name);
    const matchedNiceToHave = skillMatches(niceToHaveSkills).map((s) => s.name);

    // 5. Generate a plain-English fit explanation using an LLM
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const explanationMsg = await llm.invoke([
      {
        role: 'system',
        content:
          'You are an honest career advisor helping a student understand their resume fit for a job. Be direct, specific, and actionable. Keep it to 3-4 sentences. Do not use bullet points.',
      },
      {
        role: 'user',
        content: `Resume scored ${score} points (${matchPercent}% match against required skills).
Matched required skills: ${matchedRequired.join(', ') || 'none'}.
Missing required skills: ${missingRequired.join(', ') || 'none'}.
Matched nice-to-have skills: ${matchedNiceToHave.join(', ') || 'none'}.

Write a brief, honest assessment of this candidate's fit and one concrete action they can take to improve their chances for this role.`,
      },
    ]);

    // 6. Clean up the uploaded file — we don't need to store it
    await fs.unlink(file.path).catch(() => {});

    res.json({
      score,
      matchPercent,
      matchedRequired,
      missingRequired,
      matchedNiceToHave,
      totalRequired: requiredCount,
      matchedCount,
      explanation: explanationMsg.content,
      // Skills the agent validated against actual resume text
      // Each carries: { name, years, source: 'listed'|'inferred'|'both', confidence, reasoning }
      allCandidateSkills: parsed.skills.map((s) => ({
        name: s.name,
        source: s.source ?? 'listed',
        confidence: s.confidence ?? 1,
      })),
      // Skills that couldn't be grounded in resume text — show these to the user
      // Each carries: { name, reason, advice }
      flaggedSkills: parsed.flaggedSkills ?? [],
    });
  } catch (err) {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    console.error('[matchController]', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed. Check your OpenAI key and try again.' });
  }
};

module.exports = { analyzeMatch };
