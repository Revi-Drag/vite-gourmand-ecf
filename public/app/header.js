export function initHeaderMenu() {
    console.log("✅ initHeaderMenu() RUN");
    const btnMenu = document.getElementById("btnMenu");
    const overlay = document.getElementById("mobileMenu");
    const btnClose = document.getElementById("btnCloseMenu");

    console.log("btnMenu:", !!btnMenu, "overlay:", !!overlay, "btnClose:", !!btnClose);

    if (!btnMenu || !overlay) return;

    const open = () => {
        overlay.hidden = false;
        btnMenu.setAttribute("aria-expanded", "true");
        document.body.classList.add("menu-open");
        (btnClose || overlay.querySelector("a,button"))?.focus?.();
    };

    const close = () => {
        overlay.hidden = true;
        btnMenu.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
        btnMenu.focus();
    };

    btnMenu.addEventListener("click", () => {
        overlay.hidden ? open() : close();
    });

    btnClose?.addEventListener("click", close);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.hidden) close();
    });

    const btnLogout = document.getElementById("btnLogout");

    btnLogout?.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) throw new Error("logout failed");

            overlay.hidden = true;
            btnMenu.setAttribute("aria-expanded", "false");
            document.body.classList.remove("menu-open");

            window.location.href = "/app/index.html";
        } catch (e) {
            console.error("Logout error:", e);
            alert("Impossible de se déconnecter.");
        }
    });

    async function updateMenuByAuth() {
        const guestEls = overlay.querySelectorAll("[data-guest]");
        const authEls = overlay.querySelectorAll("[data-auth]");
        const employeeEls = overlay.querySelectorAll('[data-role="employee"]');
        const adminEls = overlay.querySelectorAll('[data-role="admin"]');

        try {
            const res = await fetch("/api/me", { credentials: "include" });

            if (!res.ok) throw new Error("not authenticated");

            const data = await res.json();

            if (!data?.success || !data?.user) throw new Error("not authenticated");

            const roles = data.user.roles || [];
            console.log("ME roles:", roles);

            guestEls.forEach((el) => (el.hidden = true));
            authEls.forEach((el) => (el.hidden = false));

            employeeEls.forEach((el) => (el.hidden = !roles.includes("ROLE_EMPLOYEE")));
            adminEls.forEach((el) => (el.hidden = !roles.includes("ROLE_ADMIN")));
        } catch (e) {
            guestEls.forEach((el) => (el.hidden = false));
            authEls.forEach((el) => (el.hidden = true));
            employeeEls.forEach((el) => (el.hidden = true));
            adminEls.forEach((el) => (el.hidden = true));
        }
    }

    updateMenuByAuth();
}