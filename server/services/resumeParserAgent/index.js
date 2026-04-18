const { sectionParserNode } = require('./nodes/sectionParser');
const { bulletAnalyzerNode } = require('./nodes/bulletAnalyzer');
const { skillsReconcilerNode } = require('./nodes/skillsReconciler');
const { hallucinationValidatorNode } = require('./nodes/hallucinationValidator');

/**
 * Resume Parser Agent — LangGraph-style 4-node sequential pipeline
 *
 * Each node is a pure async function: (state) => Partial<state>
 * We accumulate state across nodes, passing the full accumulated state into each.
 * This mirrors exactly how LangGraph's StateGraph runs a linear chain,
 * without any dependency on LangGraph's version-sensitive StateGraph API.
 *
 * Node 1 — Section Parser
 *   Splits raw PDF text into labelled sections: experience[], projects[],
 *   skills[], education[]  (handles "Work History" / "Employment" / etc.)
 *
 * Node 2 — Bullet Analyzer   ← core intelligence
 *   Reads ONLY experience + project bullets (never the skills section) and
 *   infers what skills the candidate actually demonstrated, each with a
 *   confidence score and reasoning. Confidence tiers:
 *     0.95 — explicit mention + context
 *     0.85 — explicit but shallow
 *     0.70 — strong implication
 *     0.55 — reasonable inference
 *     <0.5 — skipped
 *
 * Node 3 — Skills Reconciler
 *   Merges inferred skills with listed skills. Tags each as:
 *     "both"     → confidence 1.0  (proven in bullets AND listed)
 *     "inferred" → bullet confidence
 *     "listed"   → 0.8  (listed but not yet evidenced in bullets)
 *   Deduplicates, normalises names, keeps highest confidence on collisions.
 *
 * Node 4 — Hallucination Validator
 *   Final quality gate. Traces every reconciled skill back to raw resume text.
 *   → validatedSkills: safe to use in scoring
 *   → flaggedSkills: { name, reason, advice } — actionable feedback for the candidate
 */

/**
 * parseResume(rawText)
 *
 * Drop-in replacement for the old regex-based skill extractor.
 * Runs all 4 nodes in sequence, accumulating shared state.
 *
 * @param {string} rawText  — raw text extracted from the PDF by pdf-parse
 * @returns {Promise<{
 *   validatedSkills: Array<{ name, years, source, confidence, reasoning }>,
 *   flaggedSkills:   Array<{ name, reason, advice }>,
 *   sections:        { experience[], projects[], skills[], education[] }
 * }>}
 */
const parseResume = async (rawText) => {
  // Shared state — each node receives the full accumulated state and returns
  // a partial update which we spread in. Identical to LangGraph's last-write-wins reducer.
  let state = { rawText };

  const t = (label) => { console.log(`[agent] ${label} — ${new Date().toISOString()}`); };

  // Node 1: split into sections
  t('sectionParser START');
  const node1 = await sectionParserNode(state);
  state = { ...state, ...node1 };
  t(`sectionParser DONE — ${state.sections?.experience?.length ?? 0} exp bullets, ${state.sections?.projects?.length ?? 0} project bullets`);

  // Node 2: infer skills from experience + project bullets
  t('bulletAnalyzer START');
  const node2 = await bulletAnalyzerNode(state);
  state = { ...state, ...node2 };
  t(`bulletAnalyzer DONE — ${state.bulletAnalysis?.length ?? 0} bullets analyzed`);

  // Node 3: merge inferred + listed, deduplicate, tag source
  t('skillsReconciler START');
  const node3 = await skillsReconcilerNode(state);
  state = { ...state, ...node3 };
  t(`skillsReconciler DONE — ${state.reconciledSkills?.length ?? 0} reconciled skills`);

  // Node 4: validate every skill against raw text, flag hallucinations
  t('hallucinationValidator START');
  const node4 = await hallucinationValidatorNode(state);
  state = { ...state, ...node4 };
  t(`hallucinationValidator DONE — ${state.validatedSkills?.length ?? 0} valid, ${state.flaggedSkills?.length ?? 0} flagged`);

  return {
    validatedSkills: state.validatedSkills ?? [],
    flaggedSkills: state.flaggedSkills ?? [],
    sections: state.sections ?? {},
  };
};

module.exports = { parseResume };
