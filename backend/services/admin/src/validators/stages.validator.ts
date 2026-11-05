import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface StageInputLike {
  stageName?: string | null;
  gate?: string | null;
  winPercentage?: number | null;
  displayOrder?: number | null;
}

const MAX_NAME = 100;
const MAX_GATE = 50;

function fieldErrors(input: StageInputLike): string[] {
  const errors: string[] = [];

  if (input.stageName && input.stageName.trim().length > MAX_NAME) {
    errors.push(`Stage Name must be at most ${MAX_NAME} characters`);
  }
  if (input.gate && input.gate.trim().length > MAX_GATE) {
    errors.push(`Gate must be at most ${MAX_GATE} characters`);
  }
  if (input.winPercentage != null && (input.winPercentage < 0 || input.winPercentage > 100)) {
    errors.push("Win % must be between 0 and 100");
  }
  if (input.displayOrder != null && !Number.isInteger(input.displayOrder)) {
    errors.push("Sequence must be a whole number");
  }

  return errors;
}

function assertValidCreate(input: StageInputLike): void {
  const errors: string[] = [];

  if (!input.stageName || !input.stageName.trim()) errors.push("Stage Name is required");
  if (input.winPercentage == null) errors.push("Win % is required");
  if (input.displayOrder == null) errors.push("Sequence is required");

  errors.push(...fieldErrors(input));

  if (errors.length) throw validationFailed(errors.join(", "));
}

function assertValidUpdate(input: StageInputLike): void {
  const errors: string[] = [];

  if ("stageName" in input && (!input.stageName || !input.stageName.trim())) {
    errors.push("Stage Name cannot be empty");
  }
  if ("winPercentage" in input && input.winPercentage == null) {
    errors.push("Win % is required");
  }
  if ("displayOrder" in input && input.displayOrder == null) {
    errors.push("Sequence is required");
  }

  errors.push(...fieldErrors(input));

  if (errors.length) throw validationFailed(errors.join(", "));
}

export { assertValidCreate, assertValidUpdate };
