const API_BASE = "";

const form = document.getElementById("form");
const statusEl = document.getElementById("status");

function show(msg) {
    statusEl.textContent = msg || "";
}

function strongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/.test(pw);
}

function clean(payload) {
    // normalisation simple (ECF-friendly)
    payload.email = (payload.email || "").trim().toLowerCase();
    payload.password = (payload.password || "");
    payload.firstName = (payload.firstName || "").trim();
    payload.lastName = (payload.lastName || "").trim();
    payload.phone = (payload.phone || "").trim();
    payload.address = (payload.address || "").trim();
    payload.city = (payload.city || "").trim();
    return payload;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    show("");

    const fd = new FormData(form);
    const payload = clean(Object.fromEntries(fd.entries()));

    if (!strongPassword(payload.password)) {
        show("Mot de passe trop faible (10+ caractères, maj/min/chiffre/spécial).");
        return;
    }

    try {
        show("Création du compte…");

        const res = await fetch(`${API_BASE}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
            show(data.error || "Erreur lors de l'inscription.");
            return;
        }

        show("Compte créé. Redirection vers la connexion…");
        setTimeout(() => {
            window.location.href = "./login.html";
        }, 600);
    } catch (err) {
        show(err?.message ? `Erreur réseau : ${err.message}` : "Erreur réseau.");
    }
});
