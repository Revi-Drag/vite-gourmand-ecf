export function buildCaps(roles = []) {
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isEmployee = roles.includes("ROLE_EMPLOYEE") || isAdmin;
    const isUser = roles.includes("ROLE_USER") || isEmployee;

    return {
        isAdmin,
        isEmployee,
        isUser,
        isAuth: roles.length > 0,
    };
}

export async function applyAuthUI() {
    try {
        const res = await fetch("/api/me", {
            credentials: "include",
        });

        // pas connecté
        if (!res.ok) {
            showGuestUI();
            return;
        }

        const me = await res.json();
        const caps = buildCaps(me.roles || []);

        applyVisibility(caps);
        setupLogout();

    } catch (e) {
        console.error("Auth UI error:", e);
        showGuestUI();
    }
}

function showGuestUI() {
    document.querySelectorAll("[data-guest]").forEach(el => el.hidden = false);
}

function applyVisibility(caps) {
    // reset
    document.querySelectorAll("[data-guest]").forEach(el => el.hidden = true);
    document.querySelectorAll("[data-auth]").forEach(el => el.hidden = true);
    document.querySelectorAll('[data-role="employee"]').forEach(el => el.hidden = true);
    document.querySelectorAll('[data-role="admin"]').forEach(el => el.hidden = true);

    // guest
    if (!caps.isAuth) {
        showGuestUI();
        return;
    }

    // auth
    document.querySelectorAll("[data-auth]").forEach(el => el.hidden = false);

    // employee
    if (caps.isEmployee) {
        document.querySelectorAll('[data-role="employee"]')
            .forEach(el => el.hidden = false);
    }

    // admin
    if (caps.isAdmin) {
        document.querySelectorAll('[data-role="admin"]')
            .forEach(el => el.hidden = false);
    }
}

function setupLogout() {
    const btn = document.getElementById("btnLogout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        try {
            await fetch("/logout", { method: "POST", credentials: "include" });
        } catch (e) { }

        window.location.href = "/app/index.html";
    });
}