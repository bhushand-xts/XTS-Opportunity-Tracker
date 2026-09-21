import {
  MenusRepository,
  MenuRecord
} from "../repositories/menus.repository";

import {
  CreateMenuInput,
  UpdateMenuInput,
  validateCreateMenu,
  validateUpdateMenu
} from "../validators/menus.validator";

export class MenusService {

  constructor(
    private readonly repository: MenusRepository
  ) {}

  async getMenus(
    asTree: boolean = false
  ): Promise<MenuRecord[]> {

    const menus = await this.repository.findAll();

    return asTree
      ? this.buildTree(menus)
      : menus;
  }

  async getMenu(
    menuId: number
  ): Promise<MenuRecord | null> {

    const menu = await this.repository.findById(menuId);

    if (!menu) {
      return null;
    }

    const allMenus = await this.repository.findAll();

    return this.findInTree(
      this.buildTree(allMenus),
      menuId
    );
  }

  async createMenu(
    input: CreateMenuInput
  ): Promise<MenuRecord> {

    validateCreateMenu(input);

    const existing = await this.repository.findByKey(
      input.menuKey.trim()
    );

    if (existing) {
      throw new Error(
        "A menu with this menu key already exists."
      );
    }

    if (input.parentId !== null && input.parentId !== undefined) {

      const parent = await this.repository.findById(
        input.parentId
      );

      if (!parent) {
        throw new Error("Parent menu not found.");
      }

      if (!parent.isActive) {
        throw new Error(
          "Cannot create a menu under an inactive parent menu."
        );
      }
    }

    return this.repository.create(input);
  }

  async updateMenu(
    menuId: number,
    input: UpdateMenuInput
  ): Promise<MenuRecord> {

    validateUpdateMenu(input);

    const existing = await this.repository.findById(menuId);

    if (!existing) {
      throw new Error("Menu not found.");
    }

    if (
      input.menuKey !== undefined &&
      input.menuKey.trim() !== existing.menuKey
    ) {

      const duplicate = await this.repository.findByKey(
        input.menuKey.trim()
      );

      if (
        duplicate &&
        duplicate.menuId !== menuId
      ) {
        throw new Error(
          "A menu with this menu key already exists."
        );
      }
    }

    if (
      input.parentId !== undefined &&
      input.parentId !== null
    ) {

      if (input.parentId === menuId) {
        throw new Error(
          "A menu cannot be its own parent."
        );
      }

      const parent = await this.repository.findById(
        input.parentId
      );

      if (!parent) {
        throw new Error("Parent menu not found.");
      }

      if (!parent.isActive) {
        throw new Error(
          "Cannot assign an inactive menu as parent."
        );
      }

      await this.validateNoCircularReference(
        menuId,
        input.parentId
      );
    }

    return this.repository.update(
      menuId,
      input
    );
  }

  async toggleMenuStatus(
    menuId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<MenuRecord> {

    const menu = await this.repository.findById(menuId);

    if (!menu) {
      throw new Error("Menu not found.");
    }

    return this.repository.updateStatus(
      menuId,
      isActive,
      updatedBy
    );
  }

  private buildTree(
    menus: MenuRecord[]
  ): MenuRecord[] {

    const menuMap = new Map<number, MenuRecord>();
    const rootMenus: MenuRecord[] = [];

    for (const menu of menus) {
      menuMap.set(menu.menuId, {
        ...menu,
        children: []
      });
    }

    for (const menu of menus) {

      const currentMenu = menuMap.get(menu.menuId)!;

      if (
        menu.parentId !== null &&
        menuMap.has(menu.parentId)
      ) {
        menuMap
          .get(menu.parentId)!
          .children!
          .push(currentMenu);
      } else {
        rootMenus.push(currentMenu);
      }
    }

    return rootMenus;
  }

  private findInTree(
    menus: MenuRecord[],
    menuId: number
  ): MenuRecord | null {

    for (const menu of menus) {

      if (menu.menuId === menuId) {
        return menu;
      }

      if (menu.children?.length) {
        const result = this.findInTree(
          menu.children,
          menuId
        );

        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private async validateNoCircularReference(
    menuId: number,
    parentId: number
  ): Promise<void> {

    let currentParentId: number | null = parentId;

    while (currentParentId !== null) {

      if (currentParentId === menuId) {
        throw new Error(
          "Circular menu hierarchy is not allowed."
        );
      }

      const parent = await this.repository.findById(
        currentParentId
      );

      if (!parent) {
        break;
      }

      currentParentId = parent.parentId;
    }
  }
}