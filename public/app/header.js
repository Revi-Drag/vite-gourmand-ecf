export function initHeaderMenu() {
    const btnMenu = document.getElementById("btnMenu");
    const overlay = document.getElementById("mobileMenu");
    const btnClose = document.getElementById("btnCloseMenu");
    const btnLogout = document.getElementById("btnLogout");

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

    btnLogout?.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!res.ok) throw new Error("logout failed");

            close();
            window.location.href = "/app/home.html";
        } catch (e) {
            console.error("Logout error:", e);
            alert("Impossible de se déconnecter.");
        }
    });
}
