const API_URL = "http://localhost:4000/graphql";

async function callGraphQL(query: string) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: query
        })
    });

    return await response.json();
}


// ================================
// GET MENUS
// ================================

async function getMenus() {
    const resultElement = document.getElementById("menusResult");

    if (!resultElement) return;

    resultElement.textContent = "Loading...";

    try {
        const result = await callGraphQL(`
            query {
                menus {
                    menuId
                    menuName
                    menuKey
                    icon
                    parentId
                    sortOrder
                    isActive
                }
            }
        `);

        resultElement.textContent =
            JSON.stringify(result, null, 2);

    } catch (error) {
        resultElement.textContent =
            "Error: " + error;
    }
}


// ================================
// GET PERMISSIONS
// ================================

async function getPermissions() {
    const resultElement = document.getElementById("permissionsResult");

    if (!resultElement) return;

    resultElement.textContent = "Loading...";

    try {
        const result = await callGraphQL(`
            query {
                permissions {
                    permissionId
                    permissionName
                    permissionKey
                    description
                    isActive
                }
            }
        `);

        resultElement.textContent =
            JSON.stringify(result, null, 2);

    } catch (error) {
        resultElement.textContent =
            "Error: " + error;
    }
}

