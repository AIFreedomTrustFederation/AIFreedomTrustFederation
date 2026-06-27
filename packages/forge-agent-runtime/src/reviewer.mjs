export function reviewPatchText(text) {
  let score = 100;
  const warnings = [];

  if (!text || !text.trim()) {
    score -= 100;
    warnings.push("Patch is empty.");
  }

  if (/rm\s+-rf|git\s+push|git\s+commit|curl\s+.*\|\s*sh/.test(text)) {
    score -= 50;
    warnings.push("Patch includes dangerous shell or git operations.");
  }

  if (/node_modules|\.env|private-key|BEGIN RSA PRIVATE KEY/i.test(text)) {
    score -= 40;
    warnings.push("Patch references protected, generated, or secret material.");
  }

  if (/package\.json|pnpm-lock\.yaml|package-lock\.json/.test(text)) {
    score -= 15;
    warnings.push("Patch may alter dependencies or lockfiles.");
  }

  if (!/diff --git|\*\*\* Begin Patch|FILE:/.test(text)) {
    score -= 20;
    warnings.push("Patch format is not clearly recognized.");
  }

  return {
    score: Math.max(0, score),
    approved: score >= 70,
    warnings
  };
}
