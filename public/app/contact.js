const form = document.getElementById("contactForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "Envoi...";

    const fd = new FormData(form);
    const payload = {
        title: fd.get("title"),
        email: fd.get("email"),
        description: fd.get("description"),
    };

    const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        statusEl.textContent = data?.errors
            ? "Erreur: " + JSON.stringify(data.errors)
            : "Erreur lors de l’envoi.";
        return;
    }

    statusEl.textContent = "Message envoyé ✅";
    form.reset();
});
