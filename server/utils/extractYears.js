/**
 * Extract years of experience from text patterns like "3 years", "2+ years", "1.5 years"
 */
const extractYearsFromText = (text, skillName) => {
  if (!text || !skillName) return 0;

  const normalizedSkill = skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const patterns = [
    // "JavaScript: 3 years", "3 years JavaScript"
    new RegExp(`(?:${skillName}|${normalizedSkill})[\\s:\\-]*([\\d.]+)\\s*(?:\\+)?\\s*years?`, 'gi'),
    new RegExp(`([\\d.]+)\\s*(?:\\+)?\\s*years?[\\s:\\-]*(?:${skillName}|${normalizedSkill})`, 'gi'),
    // Generic "X years" near skill
    new RegExp(`([\\d.]+)\\s*(?:\\+)?\\s*years?`, 'gi'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const yearsMatch = match[0].match(/([\d.]+)/);
      if (yearsMatch) {
        const years = parseFloat(yearsMatch[1]);
        return isNaN(years) ? 0 : Math.min(years, 30); // Cap at 30
      }
    }
  }

  return 0;
};

module.exports = { extractYearsFromText };
