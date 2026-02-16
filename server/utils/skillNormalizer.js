/**
 * Skill normalization map: common variations → canonical form
 */
const SKILL_ALIASES = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'reactjs': 'React',
  'react.js': 'React',
  'vuejs': 'Vue.js',
  'vue': 'Vue.js',
  'angularjs': 'Angular',
  'angular': 'Angular',
  'python': 'Python',
  'py': 'Python',
  'java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'sql': 'SQL',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'redis': 'Redis',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'git': 'Git',
  'github': 'Git',
  'rest': 'REST API',
  'rest api': 'REST API',
  'graphql': 'GraphQL',
  'graph ql': 'GraphQL',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'html': 'HTML',
  'html5': 'HTML',
  'css': 'CSS',
  'css3': 'CSS',
  'express': 'Express.js',
  'expressjs': 'Express.js',
  'redux': 'Redux',
  'jest': 'Jest',
  'mocha': 'Mocha',
  'agile': 'Agile',
  'scrum': 'Scrum',
  'jira': 'Jira',
  'ci/cd': 'CI/CD',
  'ci cd': 'CI/CD',
  'machine learning': 'Machine Learning',
  'ml': 'Machine Learning',
  'artificial intelligence': 'AI',
  'ai': 'AI',
  'data structures': 'Data Structures',
  'algorithms': 'Algorithms',
};

/**
 * Normalize a skill name to canonical form
 */
const normalizeSkill = (skillName) => {
  if (!skillName || typeof skillName !== 'string') return null;
  const trimmed = skillName.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return SKILL_ALIASES[lower] || trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

module.exports = { normalizeSkill, SKILL_ALIASES };
