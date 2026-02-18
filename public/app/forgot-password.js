const API_BASE = "";

const form = document.getElementById("form");
const statusEl = document.getElementById("status");

function show(msg) {
    statusEl.textContent = msg || "";
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    show("");

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    try {
        show("Envoi…");

        const res = await fetch(`${API_BASE}/api/password/forgot`, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
        });

        // réponse générique
        await res.json().catch(() => ({}));
        show("Si ce compte existe, un lien a été envoyé.");
    } catch {
        show("Erreur réseau.");
    }
});
