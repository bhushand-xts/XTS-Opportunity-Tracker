export interface Currency {
  currencyId: number;
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

export interface CurrencyInput {
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  createdBy?: number;
  updatedBy?: number;
}