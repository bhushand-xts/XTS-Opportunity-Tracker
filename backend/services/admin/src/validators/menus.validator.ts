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

// Column sizes of mst_menus — checking here gives a readable message instead
// of a database "value too long" error.
const MAX_NAME = 100;
const MAX_KEY = 100;
const MAX_ICON = 50;

function validateLengths(input: {
  menuName?: string;
  menuKey?: string;
  icon?: string | null;
}): void {
  if (input.menuName && input.menuName.trim().length > MAX_NAME) {
    throw new Error(`Menu name must be at most ${MAX_NAME} characters.`);
  }

  if (input.menuKey && input.menuKey.trim().length > MAX_KEY) {
    throw new Error(`Menu key must be at most ${MAX_KEY} characters.`);
  }

  if (input.icon && input.icon.length > MAX_ICON) {
    throw new Error(`Icon must be at most ${MAX_ICON} characters.`);
  }
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

  validateLengths(input);

  if (!input.createdBy) {
    throw new Error("You must be signed in to make changes.");
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

  validateLengths(input);

  if (!input.updatedBy) {
    throw new Error("You must be signed in to make changes.");
  }
}