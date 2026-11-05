export interface RateMaster {
  ratemasterId: number;
  roleName: string;
  roleCode: string;
  currencyId: number;
  rateType: string;
  defaultRate: number;
  location: string | null;
  description: string | null;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

export interface RateMasterInput {
  roleName: string;
  roleCode: string;
  currencyId: number;
  rateType: string;
  defaultRate: number;
  location?: string | null;
  description?: string | null;
  createdBy?: number;
  updatedBy?: number;
}