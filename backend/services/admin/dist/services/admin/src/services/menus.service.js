"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenusService = void 0;
const menus_validator_1 = require("../validators/menus.validator");
class MenusService {
    constructor(repository) {
        this.repository = repository;
    }
    async getMenus(asTree = false) {
        const menus = await this.repository.findAll();
        return asTree
            ? this.buildTree(menus)
            : menus;
    }
    async getMenu(menuId) {
        const menu = await this.repository.findById(menuId);
        if (!menu) {
            return null;
        }
        const allMenus = await this.repository.findAll();
        return this.findInTree(this.buildTree(allMenus), menuId);
    }
    async createMenu(input) {
        (0, menus_validator_1.validateCreateMenu)(input);
        const existing = await this.repository.findByKey(input.menuKey.trim());
        if (existing) {
            throw new Error("A menu with this menu key already exists.");
        }
        if (input.parentId !== null && input.parentId !== undefined) {
            const parent = await this.repository.findById(input.parentId);
            if (!parent) {
                throw new Error("Parent menu not found.");
            }
            if (!parent.isActive) {
                throw new Error("Cannot create a menu under an inactive parent menu.");
            }
        }
        return this.repository.create(input);
    }
    async updateMenu(menuId, input) {
        (0, menus_validator_1.validateUpdateMenu)(input);
        const existing = await this.repository.findById(menuId);
        if (!existing) {
            throw new Error("Menu not found.");
        }
        if (input.menuKey !== undefined &&
            input.menuKey.trim() !== existing.menuKey) {
            const duplicate = await this.repository.findByKey(input.menuKey.trim());
            if (duplicate &&
                duplicate.menuId !== menuId) {
                throw new Error("A menu with this menu key already exists.");
            }
        }
        if (input.parentId !== undefined &&
            input.parentId !== null) {
            if (input.parentId === menuId) {
                throw new Error("A menu cannot be its own parent.");
            }
            const parent = await this.repository.findById(input.parentId);
            if (!parent) {
                throw new Error("Parent menu not found.");
            }
            if (!parent.isActive) {
                throw new Error("Cannot assign an inactive menu as parent.");
            }
            await this.validateNoCircularReference(menuId, input.parentId);
        }
        return this.repository.update(menuId, input);
    }
    async toggleMenuStatus(menuId, isActive, updatedBy) {
        const menu = await this.repository.findById(menuId);
        if (!menu) {
            throw new Error("Menu not found.");
        }
        return this.repository.updateStatus(menuId, isActive, updatedBy);
    }
    buildTree(menus) {
        const menuMap = new Map();
        const rootMenus = [];
        for (const menu of menus) {
            menuMap.set(menu.menuId, {
                ...menu,
                children: []
            });
        }
        for (const menu of menus) {
            const currentMenu = menuMap.get(menu.menuId);
            if (menu.parentId !== null &&
                menuMap.has(menu.parentId)) {
                menuMap
                    .get(menu.parentId)
                    .children
                    .push(currentMenu);
            }
            else {
                rootMenus.push(currentMenu);
            }
        }
        return rootMenus;
    }
    findInTree(menus, menuId) {
        for (const menu of menus) {
            if (menu.menuId === menuId) {
                return menu;
            }
            if (menu.children?.length) {
                const result = this.findInTree(menu.children, menuId);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
    async validateNoCircularReference(menuId, parentId) {
        let currentParentId = parentId;
        while (currentParentId !== null) {
            if (currentParentId === menuId) {
                throw new Error("Circular menu hierarchy is not allowed.");
            }
            const parent = await this.repository.findById(currentParentId);
            if (!parent) {
                break;
            }
            currentParentId = parent.parentId;
        }
    }
}
exports.MenusService = MenusService;
//# sourceMappingURL=menus.service.js.map