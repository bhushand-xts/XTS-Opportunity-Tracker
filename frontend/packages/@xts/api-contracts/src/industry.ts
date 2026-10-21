export interface Industry {
  industryId: number;
  industryName: string;
  description: string | null;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

export interface IndustryInput {
  industryName: string;
  description?: string | null;
  createdBy?: number;
  updatedBy?: number;
}
