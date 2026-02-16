const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const { normalizeSkill } = require('../utils/skillNormalizer');
const { extractYearsFromText } = require('../utils/extractYears');

/**
 * Known skills to look for in resume text (lowercase for matching)
 */
const KNOWN_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'php', 'swift', 'kotlin',
  'react', 'vue', 'angular', 'node', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'redux', 'graphql', 'rest', 'mongodb', 'mysql',
  'postgresql', 'redis', 'sql', 'aws', 'docker', 'kubernetes', 'jenkins', 'git', 'linux', 'agile',
  'scrum', 'jira', 'machine learning', 'ai', 'data structures', 'algorithms', 'testing', 'jest',
  'mocha', 'cypress', 'ci/cd', 'terraform', 'ansible',
];

/**
 * Extract skills from raw resume text
 */
const extractSkillsFromText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  const text = rawText.toLowerCase();
  const skillMap = new Map(); // name -> years

  // Check known skills
  for (const skill of KNOWN_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(rawText)) {
      const canonical = normalizeSkill(skill);
      const years = extractYearsFromText(rawText, skill) || 0;
      const existing = skillMap.get(canonical);
      skillMap.set(canonical, Math.max(existing || 0, years));
    }
  }

  // Extract total experience (e.g., "5 years of experience", "3+ years experience")
  const totalExpMatch = rawText.match(/(?:total|overall|[\d.]+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
    || rawText.match(/([\d.]+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:software|development|engineering)/i);
  let totalExperience = 0;
  if (totalExpMatch) {
    const numMatch = totalExpMatch[0].match(/([\d.]+)/);
    if (numMatch) totalExperience = parseFloat(numMatch[1]) || 0;
  }

  const skills = Array.from(skillMap.entries()).map(([name, years]) => ({
    name,
    years: years || (totalExperience > 0 ? Math.round(totalExperience / 2) : 0),
  }));

  return { skills, totalExperience };
};

/**
 * Parse PDF file and extract candidate data
 */
const parseResumePDF = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  const rawText = data.text || '';

  const { skills, totalExperience } = extractSkillsFromText(rawText);

  // Extract name (first line or "Name:" pattern)
  const nameMatch = rawText.match(/(?:^|\n)\s*(?:name|full name)[\s:]*([^\n]+)/i)
    || rawText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
  const name = nameMatch ? nameMatch[1].trim() : 'Unknown Candidate';

  // Extract email
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : '';

  return {
    name,
    email,
    skills,
    totalExperience: totalExperience || skills.reduce((sum, s) => sum + (s.years || 0), 0) / Math.max(skills.length, 1),
    rawText,
  };
};

module.exports = {
  parseResumePDF,
  extractSkillsFromText,
};
