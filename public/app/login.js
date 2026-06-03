const form = document.getElementById("loginForm");
const msg = document.getElementById("loginMsg");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const formData = new FormData(form);
    const payload = {
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
    };

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // IMPORTANT: cookie/session
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { }

        if (!res.ok) {
            msg.textContent = data?.error || `Erreur login (HTTP ${res.status})`;
            msg.className = "msg error";
            return;
        }

        // si pas de JSON, on considère que c’est OK (session créée)
        if (data?.success === false) {
            msg.textContent = data.error || "Erreur login";
            msg.className = "msg error";
            return;
        }


        msg.textContent = `Connecté : ${data.user?.email}`;
        msg.className = "msg ok";

        // redirect intelligent : si on vient d'une page protégée, on y retourne
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");

        // petite pause visuelle
        setTimeout(() => {
            window.location.href = redirect ? decodeURIComponent(redirect) : "./home.html";
        }, 300);


    } catch (err) {
        msg.textContent = "Erreur réseau ou serveur non disponible.";
        msg.className = "msg error";
    }
});
