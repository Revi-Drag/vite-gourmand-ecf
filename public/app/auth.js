export function buildCaps(roles = []) {
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isEmployee = roles.includes("ROLE_EMPLOYEE") || isAdmin;
    const isUser = roles.includes("ROLE_USER") || isEmployee || isAdmin;

    return {
        isAdmin,
        isEmployee,
        isUser,
        isAuth: roles.length > 0,
    };
}

export async function applyAuthUI() {
    resetAuthUI();

    try {
        const res = await fetch("/api/me", {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            showGuestUI();
            return;
        }

        const data = await res.json();

        if (!data?.success || !data?.user) {
            showGuestUI();
            return;
        }

        const roles = Array.isArray(data.user.roles) ? data.user.roles : [];
        const caps = buildCaps(roles);

        applyVisibility(caps);
    } catch (e) {
        console.error("Auth UI error:", e);
        showGuestUI();
    }
}

function resetAuthUI() {
    document.querySelectorAll("[data-guest]").forEach((el) => {
        el.hidden = true;
    });

    document.querySelectorAll("[data-auth]").forEach((el) => {
        el.hidden = true;
    });

    document.querySelectorAll('[data-role="employee"]').forEach((el) => {
        el.hidden = true;
    });

    document.querySelectorAll('[data-role="admin"]').forEach((el) => {
        el.hidden = true;
    });
}

function showGuestUI() {
    resetAuthUI();

    document.querySelectorAll("[data-guest]").forEach((el) => {
        el.hidden = false;
    });
}

function applyVisibility(caps) {
    resetAuthUI();

    if (!caps.isAuth) {
        showGuestUI();
        return;
    }

    document.querySelectorAll("[data-auth]").forEach((el) => {
        el.hidden = false;
    });

    if (caps.isEmployee) {
        document.querySelectorAll('[data-role="employee"]').forEach((el) => {
            el.hidden = false;
        });
    }

    if (caps.isAdmin) {
        document.querySelectorAll('[data-role="admin"]').forEach((el) => {
            el.hidden = false;
        });
    }
}
