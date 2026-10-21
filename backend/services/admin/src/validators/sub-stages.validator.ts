import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface SubStageInputLike {
  stageId?: number | null;
  subStageName?: string | null;
}

const MAX_NAME = 150;

function fieldErrors(input: SubStageInputLike): string[] {
  const errors: string[] = [];

  if (input.subStageName && input.subStageName.trim().length > MAX_NAME) {
    errors.push(`Sub Stage Name must be at most ${MAX_NAME} characters`);
  }

  return errors;
}

function assertValidCreate(input: SubStageInputLike): void {
  const errors: string[] = [];

  if (!input.stageId) errors.push("Stage is required");
  if (!input.subStageName || !input.subStageName.trim()) errors.push("Sub Stage Name is required");

  errors.push(...fieldErrors(input));

  if (errors.length) throw validationFailed(errors.join(", "));
}

function assertValidUpdate(input: SubStageInputLike): void {
  const errors: string[] = [];

  if ("stageId" in input && !input.stageId) errors.push("Stage is required");
  if ("subStageName" in input && (!input.subStageName || !input.subStageName.trim())) {
    errors.push("Sub Stage Name cannot be empty");
  }

  errors.push(...fieldErrors(input));

  if (errors.length) throw validationFailed(errors.join(", "));
}

export { assertValidCreate, assertValidUpdate };
