import { validationFailed } from "../../../../shared/errors/graphqlErrors";

export interface OpportunityInputLike {
  opportunityName?: string | null;
  opportunityTypeId?: number | null;
  sourceTypeId?: number | null;
  clientId?: number | null;
  stageId?: number | null;
  subStageId?: number | null;
  ownerId?: number | null;
  assignedTo?: number | null;

  priority?: string | null;
  serviceLine?: string | null;

  solicitationNumber?: string | null;
  issuingAgency?: string | null;
  procurementContact?: string | null;
  queDueDate?: string | null;
  submissionMethod?: string | null;
  contractTerm?: string | null;
  incumbentVendor?: string | null;
  preBidMeeting?: number | null;

  documentType?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  uploadedBy?: number | null;
  uploadedDt?: string | null;
  docSubmissionFormat?: string | null;
  evaluationBasis?: string | null;

  opportunityDescription?: string | null;

  leadReceivedDate?: string | null;
  expectedStartDate?: string | null;
  expectedCloseDate?: string | null;
  proposalDueDate?: string | null;

  estimatedValue?: number | null;
  estimatedValueUsd?: number | null;
  currencyId?: number | null;
  rfpType?: number | null;

  createdBy?: number | null;
  updatedBy?: number | null;
}

function required(
  value: string | number | null | undefined,
  message: string
): string[] {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  ) {
    return [message];
  }

  return [];
}

function validateOpportunity(
  input: OpportunityInputLike
): string[] {
  const errors: string[] = [];

  const textLimits: Partial<Record<keyof OpportunityInputLike, number>> = {
    opportunityName: 255, priority: 30, serviceLine: 255, solicitationNumber: 50,
    issuingAgency: 255, procurementContact: 50, submissionMethod: 255, contractTerm: 50,
    incumbentVendor: 255, documentType: 50, fileName: 100, filePath: 100,
    docSubmissionFormat: 100, evaluationBasis: 100,
  };
  for (const [key, max] of Object.entries(textLimits)) {
    const value = input[key as keyof OpportunityInputLike];
    if (typeof value === 'string' && Array.from(value.trim()).length > max!) {
      errors.push(`${key} must be at most ${max} characters.`);
    }
  }
  if (input.estimatedValue != null &&
    (!Number.isFinite(input.estimatedValue) || Math.round(input.estimatedValue * 100) / 100 >= 1e13)) {
    errors.push('Estimated Value must fit numeric(15,2).');
  }

  if (input.estimatedValueUsd == null) errors.push('Estimated Value USD is required.');
  else if (!Number.isFinite(input.estimatedValueUsd) || input.estimatedValueUsd < 0 || input.estimatedValueUsd >= 1e13 || Math.abs(input.estimatedValueUsd * 100 - Math.round(input.estimatedValueUsd * 100)) > 0.001) {
    errors.push('Estimated Value USD must be non-negative, fit numeric(15,2), and have at most two decimals.');
  }

  errors.push(
    ...required(
      input.opportunityName,
      "Opportunity Name is required."
    )
  );

  errors.push(
    ...required(
      input.opportunityTypeId,
      "Opportunity Type is required."
    )
  );

  errors.push(
    ...required(
      input.sourceTypeId,
      "Source Type is required."
    )
  );

  errors.push(
    ...required(
      input.clientId,
      "Client is required."
    )
  );

  errors.push(
    ...required(
      input.ownerId,
      "Owner is required."
    )
  );

  errors.push(
    ...required(
      input.priority,
      "Priority is required."
    )
  );

  errors.push(
    ...required(
      input.serviceLine,
      "Service Line is required."
    )
  );

  if (
    input.estimatedValue !== null &&
    input.estimatedValue !== undefined &&
    input.estimatedValue < 0
  ) {
    errors.push(
      "Estimated Value cannot be negative."
    );
  }

  return errors;
}

export function validateCreateOpportunity(
  input: OpportunityInputLike
): void {
  const errors = validateOpportunity(input);

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}

export function validateUpdateOpportunity(
  input: OpportunityInputLike
): void {
  const errors = validateOpportunity(input);

  if (errors.length) {
    throw validationFailed(errors.join(", "));
  }
}
