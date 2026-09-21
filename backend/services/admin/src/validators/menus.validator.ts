export interface CreateMenuInput {
  menuName: string;
  menuKey: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder: number;
  createdBy: number;
}

export interface UpdateMenuInput {
  menuName?: string;
  menuKey?: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder?: number;
  updatedBy: number;
}

export function validateCreateMenu(input: CreateMenuInput): void {
  if (!input.menuName?.trim()) {
    throw new Error("Menu name is required.");
  }

  if (!input.menuKey?.trim()) {
    throw new Error("Menu key is required.");
  }

  if (input.sortOrder === undefined || input.sortOrder < 0) {
    throw new Error("Sort order must be greater than or equal to 0.");
  }

  if (!input.createdBy) {
    throw new Error("Created by is required.");
  }
}

export function validateUpdateMenu(input: UpdateMenuInput): void {
  if (input.menuName !== undefined && !input.menuName.trim()) {
    throw new Error("Menu name cannot be empty.");
  }

  if (input.menuKey !== undefined && !input.menuKey.trim()) {
    throw new Error("Menu key cannot be empty.");
  }

  if (input.sortOrder !== undefined && input.sortOrder < 0) {
    throw new Error("Sort order must be greater than or equal to 0.");
  }

  if (!input.updatedBy) {
    throw new Error("Updated by is required.");
  }
}