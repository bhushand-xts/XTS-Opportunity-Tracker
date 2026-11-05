const VALID_RATE_TYPES = [
  "Hourly",
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
] as const;
export interface CreateRateMasterInput {
  roleName: string;
  roleCode: string;
  currencyId: number;
  rateType: string;
  defaultRate: number;
  location?: string | null;
  description?: string | null;
  createdBy: number;
}

export interface UpdateRateMasterInput {
  roleName: string;
  roleCode: string;
  currencyId: number;
  rateType: string;
  defaultRate: number;
  location?: string | null;
  description?: string | null;
  updatedBy: number;
}


// --------------------------------------------------
// VALIDATION
// --------------------------------------------------
function validateRateType(rateType: string): void {
  if (
    !VALID_RATE_TYPES.includes(
      rateType.trim() as typeof VALID_RATE_TYPES[number]
    )
  ) {
    throw new Error(
      "Rate type must be Hourly, Daily, Weekly, Monthly, or Yearly."
    );
  }
}
export function validateCreateRateMaster(
  input: CreateRateMasterInput
): void {

  if (!input.roleName?.trim()) {
    throw new Error(
      "Technical role name is required."
    );
  }

  if (!input.roleCode?.trim()) {
    throw new Error(
      "Role code is required."
    );
  }

if (!input.currencyId) {
  throw new Error("Currency is required.");
}

if (!input.rateType?.trim()) {
  throw new Error(
    "Rate type is required."
  );
}

validateRateType(input.rateType);

  if (
    input.defaultRate === undefined ||
    input.defaultRate === null ||
    input.defaultRate <= 0
  ) {
    throw new Error(
      "Default rate must be a valid positive numeric value."
    );
  }

  if (!input.createdBy) {
    throw new Error(
      "You must be signed in to make changes."
    );
  }
}


export function validateUpdateRateMaster(
  input: UpdateRateMasterInput
): void {

  if (!input.roleName?.trim()) {
    throw new Error(
      "Technical role name is required."
    );
  }

  if (!input.roleCode?.trim()) {
    throw new Error(
      "Role code is required."
    );
  }

if (!input.currencyId) {
  throw new Error("Currency is required.");
}

if (!input.rateType?.trim()) {
  throw new Error(
    "Rate type is required."
  );
}

validateRateType(input.rateType);

  if (
    input.defaultRate === undefined ||
    input.defaultRate === null ||
    input.defaultRate <= 0
  ) {
    throw new Error(
      "Default rate must be a valid positive numeric value."
    );
  }

  if (!input.updatedBy) {
    throw new Error(
      "You must be signed in to make changes."
    );
  }
}