import type { Estimation } from '@xts/api-contracts';

/** Check the current matrix before opening the submission confirmation. */
export function estimationSubmissionError(estimate: Estimation | null | undefined): string | undefined {
  const grid = estimate?.grid;
  if (!estimate || !grid?.phaseIds.length || !grid.roleCodes.length) return 'Select at least one phase and technical role before submitting.';
  let hasEffort = false;
  for (const phaseId of grid.phaseIds) {
    const duration = grid.durations.find(item => item.phaseId === phaseId)?.weeks;
    if (!duration?.trim() || !Number.isFinite(Number(duration)) || Number(duration) <= 0) return 'Enter a positive duration for every selected phase.';
    for (const roleCode of grid.roleCodes) {
      const effort = grid.allocations.find(item => item.phaseId === phaseId && item.roleCode === roleCode)?.effort;
      if (!effort?.trim() || !Number.isFinite(Number(effort)) || Number(effort) < 0) return 'Enter effort for every selected phase and role. Use 0 for unused cells.';
      if (Number(effort) === 0) continue;
      hasEffort = true;
      const row = estimate.rows.find(item => item.id === `grid-${phaseId}-${roleCode}`);
      if (!row || !Number.isFinite(Number(row.hourlyRate)) || Number(row.hourlyRate) <= 0) return 'Configure a positive rate for every role with effort before submitting.';
      if (!Number.isFinite(Number(row.hours)) || Math.abs(Number(row.hours) - Number(duration) * Number(effort) * 40) > 0.0001) return 'Check the matrix effort values before submitting.';
    }
  }
  if (!hasEffort) return 'Enter positive effort for at least one phase and role before submitting.';
}
