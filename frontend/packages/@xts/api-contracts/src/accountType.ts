export interface AccountType {
  accountTypeId: number;
  accountName: string;
  description: string | null;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

export interface AccountTypeInput {
  accountName: string;
  description?: string | null;
  createdBy?: number;
  updatedBy?: number;
}
