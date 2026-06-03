const API_BASE = "";

const form = document.getElementById("form");
const statusEl = document.getElementById("status");

function show(msg) {
    statusEl.textContent = msg || "";
}

function strongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/.test(pw);
}

function getToken() {
    const url = new URL(window.location.href);
    return url.searchParams.get("token") || "";
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    show("");

    const token = getToken();
    if (!token) {
        show("Lien invalide (token manquant).");
        return;
    }

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.token = token;

    if (!strongPassword(payload.password || "")) {
        show("Mot de passe trop faible.");
        return;
    }

    try {
        show("Mise à jour…");

        const res = await fetch(`${API_BASE}/api/password/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            show(data.error || "Erreur.");
            return;
        }

        show("Mot de passe mis à jour. Redirection…");
        setTimeout(() => (window.location.href = "./login.html"), 800);
    } catch {
        show("Erreur réseau.");
    }
});
