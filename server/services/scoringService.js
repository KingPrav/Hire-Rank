const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { getCachedRankings, cacheRankings } = require('../config/redis');
const { normalizeSkill } = require('../utils/skillNormalizer');

/**
 * Experience multiplier per spec:
 * 0–1 years: 0.5
 * 1–3 years: 1
 * 3+ years: 1.5
 */
const getExperienceMultiplier = (years) => {
  if (years < 1) return 0.5;
  if (years < 3) return 1;
  return 1.5;
};

/**
 * Get candidate's years for a skill (with normalization)
 */
const getCandidateSkillYears = (candidate, skillName) => {
  const normalized = normalizeSkill(skillName);
  const skill = candidate.skills.find(
    (s) => normalizeSkill(s.name) === normalized || s.name.toLowerCase() === skillName.toLowerCase()
  );
  return skill ? (skill.years || 0) : 0;
};

/**
 * Calculate score for a single candidate against a job
 */
const calculateCandidateScore = (candidate, job) => {
  let score = 0;
  const requiredSkills = job.requiredSkills || [];
  const niceToHaveSkills = job.niceToHaveSkills || [];
  let matchedRequired = 0;

  // Required skills (full weight)
  for (const { name, weight } of requiredSkills) {
    const years = getCandidateSkillYears(candidate, name);
    const multiplier = getExperienceMultiplier(years);
    score += weight * multiplier;
    if (years > 0) matchedRequired++;
  }

  // Nice-to-have skills (lower weight: 0.5x)
  for (const { name, weight } of niceToHaveSkills) {
    const years = getCandidateSkillYears(candidate, name);
    const multiplier = getExperienceMultiplier(years);
    score += 0.5 * weight * multiplier;
  }

  // Bonus for ≥80% required skill match
  const requiredCount = requiredSkills.length;
  const matchPercent = requiredCount > 0 ? (matchedRequired / requiredCount) * 100 : 100;
  if (matchPercent >= 80) {
    score *= 1.2; // 20% bonus
  }

  return {
    score: Math.round(score * 100) / 100,
    matchPercent: Math.round(matchPercent),
    matchedRequired,
    requiredCount,
  };
};

/**
 * Rank all candidates for a job, sorted descending by score
 */
const rankCandidatesForJob = async (jobId) => {
  const job = await Job.findById(jobId).lean();
  if (!job) return null;

  const candidates = await Candidate.find({ job: jobId }).lean();
  const rankings = candidates.map((candidate) => {
    const { score, matchPercent, matchedRequired, requiredCount } = calculateCandidateScore(
      candidate,
      job
    );
    return {
      candidateId: candidate._id,
      name: candidate.name,
      email: candidate.email,
      score,
      matchPercent,
      matchedRequired,
      requiredCount,
      skills: candidate.skills,
      totalExperience: candidate.totalExperience,
    };
  });

  // Sort descending by score
  rankings.sort((a, b) => b.score - a.score);

  return rankings;
};

/**
 * Get rankings (from cache or compute)
 */
const getRankings = async (jobId) => {
  const cached = await getCachedRankings(jobId);
  if (cached) return cached;

  const rankings = await rankCandidatesForJob(jobId);
  if (rankings) await cacheRankings(jobId, rankings, 600); // 10 min TTL

  return rankings;
};

module.exports = {
  calculateCandidateScore,
  rankCandidatesForJob,
  getRankings,
  getExperienceMultiplier,
};
