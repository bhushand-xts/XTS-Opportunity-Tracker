const API_URL = "http://localhost:5001/graphql";


// ==========================
// GET MENUS
// ==========================

async function getMenus() {

    const result = document.getElementById("result");

    result.textContent = "Loading menus...";

    try {

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                query: `
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
                `
            })
        });

        const data = await response.json();

        result.textContent = JSON.stringify(data, null, 2);

    } catch (error) {

        result.textContent = "Menu Error:\n" + error;

        console.error(error);
    }
}


// ==========================
// GET PERMISSIONS
// ==========================

async function getPermissions() {

    const result = document.getElementById("result");

    result.textContent = "Loading permissions...";

    try {

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                query: `
                    query {
                        permissions {
                            permissionId
                            permissionName
                            permissionKey
                            description
                            isActive
                        }
                    }
                `
            })
        });

        const data = await response.json();

        result.textContent = JSON.stringify(data, null, 2);

    } catch (error) {

        result.textContent = "Permission Error:\n" + error;

        console.error(error);
    }
}

