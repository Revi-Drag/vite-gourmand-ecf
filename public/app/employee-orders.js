const els = {
    grid: document.getElementById("ordersGrid"),
    status: document.getElementById("status"),
};

const STATUS_OPTIONS = ["ACCEPTED", "PREPARING", "DELIVERING", "DELIVERED", "DONE"];

function escapeHtml(str) {
    return String(str ?? "")
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

function setStatus(msg, isError = false) {
    els.status.textContent = msg;
    els.status.className = isError ? "status error" : "status";
}

function render(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
        els.grid.innerHTML = `<div class="card"><p>Aucune commande.</p></div>`;
        return;
    }

    els.grid.innerHTML = orders.map(o => {
        const menuTitle = escapeHtml(o.menu?.title);
        const city = escapeHtml(o.eventCity);
        const addr = escapeHtml(o.eventAddress);
        const email = escapeHtml(o.customerEmail);
        const date = escapeHtml(o.eventDate);
        const current = o.status;

        const options = STATUS_OPTIONS.map(s =>
            `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`
        ).join("");

        return `
      <div class="card">
        <div class="row">
          <h3>Commande #${o.id}</h3>
          <span class="badge">${escapeHtml(current)}</span>
        </div>

        <p><b>Client :</b> ${email}</p>
        <p><b>Menu :</b> ${menuTitle}</p>
        <p><b>Événement :</b> ${date} — ${city}</p>
        <p><b>Adresse :</b> ${addr}</p>
        <p><b>Personnes :</b> ${o.persons}</p>
        <p><b>Total :</b> ${fmtMoney(o.totalPrice)}</p>

        <div class="row">
          <select data-id="${o.id}">${options}</select>
          <button class="btn" data-action="update" data-id="${o.id}">Mettre à jour</button>
        </div>
      </div>
    `;
    }).join("");
}

async function loadOrders() {
    setStatus("Chargement...");
    const res = await fetch("/api/employee/orders", { credentials: "include" });

    if (res.status === 401) return setStatus("Non authentifié. Connecte-toi.", true);
    if (res.status === 403) return setStatus("Accès refusé (ROLE_EMPLOYEE requis).", true);

    const data = await res.json();
    render(data);
    setStatus("");
}

async function updateStatus(id) {
    const select = document.querySelector(`select[data-id="${id}"]`);
    const status = select?.value;

    setStatus(`Mise à jour commande #${id}...`);

    const res = await fetch(`/api/employee/orders/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        setStatus(data.error || "Erreur mise à jour.", true);
        return;
    }

    setStatus("Statut mis à jour ✅");
    loadOrders();
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-action="update"]');
    if (!btn) return;
    updateStatus(btn.getAttribute("data-id"));
});

loadOrders();
