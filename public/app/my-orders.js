const API_BASE = ""; // même domaine

const els = {
    grid: document.getElementById("ordersGrid"),
    status: document.getElementById("status"),
};

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function fmtMoney(n) {
    const v = Number(n || 0);
    return `${v.toFixed(2)} €`;
}

function renderOrders(orders) {
    if (!orders.length) {
        els.grid.innerHTML = `<div class="card"><p>Aucune commande pour le moment.</p></div>`;
        return;
    }

    els.grid.innerHTML = orders.map((o) => {
        const menuTitle = o.menu?.title ? escapeHtml(o.menu.title) : `Menu #${o.menu?.id ?? "?"}`;
        const status = escapeHtml(o.status || "UNKNOWN");

        return `
      <article class="card">
        <h3>Commande #${o.id}</h3>

        <div class="badges">
          <span class="badge">${status}</span>
        </div>

        <p><strong>Menu :</strong> ${menuTitle}</p>
        <p><strong>Prestation :</strong> ${escapeHtml(o.eventDate)} — ${escapeHtml(o.eventCity)}, ${escapeHtml(o.eventAddress)}</p>
        <p><strong>Personnes :</strong> ${o.persons}</p>

        ${o.status === "PENDING"
                ? `<button class="btn danger" data-id="${o.id}">Annuler</button>`
                : ""
            }

        <div class="row">
          <span>Menu: <strong>${fmtMoney(o.menuPrice)}</strong></span>
          <span>Livraison: <strong>${fmtMoney(o.deliveryPrice)}</strong></span>
        </div>

        <div class="row">
          <span>Total: <strong>${fmtMoney(o.totalPrice)}</strong></span>
          <a class="btn" href="./menu.html?id=${o.menu?.id ?? ""}">Voir le menu</a>
        </div>
      </article>
    `;
    }).join("");
}
// Annulation d'une commande (DELETE)
els.grid.addEventListener("click", async (e) => {
    if (!e.target.matches("button[data-id]")) return;

    const id = e.target.dataset.id;

    if (!confirm("Annuler cette commande ?")) return;

    const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!res.ok) {
        alert("Erreur lors de l’annulation.");
        return;
    }

    alert("Commande annulée.");
    loadOrders(); // recharge la liste
});

async function loadOrders() {
    els.status.textContent = "Chargement…";

    const res = await fetch(`${API_BASE}/api/orders/mine`, {
        headers: { "Accept": "application/json" },
        credentials: "include",
    });

    if (res.status === 401) {
        // pas connecté → login puis retour ici
        const redirect = encodeURIComponent("/app/my-orders.html");
        window.location.href = `./login.html?redirect=${redirect}`;
        return;
    }

    if (!res.ok) {
        els.status.textContent = `Erreur chargement (HTTP ${res.status})`;
        els.grid.innerHTML = "";
        return;
    }

    const orders = await res.json();
    els.status.textContent = `${orders.length} commande(s)`;
    renderOrders(orders);
}

loadOrders().catch((e) => {
    console.error(e);
    els.status.textContent = "Erreur inattendue.";
});
