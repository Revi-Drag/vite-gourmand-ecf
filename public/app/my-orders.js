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

function renderReviewForm(orderId) {
    return `
      <div class="card" style="margin-top:12px; border:1px solid #ddd;">
        <h4>Laisser un avis</h4>

        <div class="field">
          <label for="reviewRating-${orderId}">Note</label>
          <select id="reviewRating-${orderId}">
            <option value="">Choisir</option>
            <option value="5">5 / 5</option>
            <option value="4">4 / 5</option>
            <option value="3">3 / 5</option>
            <option value="2">2 / 5</option>
            <option value="1">1 / 5</option>
          </select>
        </div>

        <div class="field" style="margin-top:10px;">
          <label for="reviewComment-${orderId}">Commentaire</label>
          <textarea id="reviewComment-${orderId}" rows="4" placeholder="Votre avis..."></textarea>
        </div>

        <div style="margin-top:12px;">
          <button class="btn" type="button" data-review-submit="${orderId}">
            Envoyer l'avis
          </button>
        </div>
      </div>
    `;
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

       <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
  ${o.status === "PENDING"
                ? `<button class="btn danger" data-id="${o.id}">Annuler</button>`
                : ""
            }

  ${(o.status === "DELIVERED" || o.status === "DONE")
                ? `<button class="btn secondary" type="button" data-review-open="${o.id}">Laisser un avis</button>`
                : ""
            }
</div>

        <div class="row">
          <span>Menu: <strong>${fmtMoney(o.menuPrice)}</strong></span>
          <span>Livraison: <strong>${fmtMoney(o.deliveryPrice)}</strong></span>
        </div>

        <div class="order-footer">
          <span>Total: <strong>${fmtMoney(o.totalPrice)}</strong></span>
          <a class="btn" href="./menu.html?id=${o.menu?.id ?? ""}">Voir ma commande</a>
        </div>

        <div id="reviewBox-${o.id}"></div>
      </article>
    `;
    }).join("");
}
// Annulation d'une commande (DELETE)
els.grid.addEventListener("click", async (e) => {

    const cancelBtn = e.target.closest("button[data-id]");
    if (cancelBtn) {
        const id = cancelBtn.dataset.id;

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
        loadOrders();
        return;
    }

    const reviewOpenBtn = e.target.closest("[data-review-open]");
    if (reviewOpenBtn) {
        const orderId = reviewOpenBtn.dataset.reviewOpen;
        const box = document.getElementById(`reviewBox-${orderId}`);
        if (!box) return;

        box.innerHTML = renderReviewForm(orderId);
        return;
    }

    const reviewSubmitBtn = e.target.closest("[data-review-submit]");
    if (reviewSubmitBtn) {
        const orderId = reviewSubmitBtn.dataset.reviewSubmit;

        const rating = Number(document.getElementById(`reviewRating-${orderId}`)?.value || 0);
        const comment = document.getElementById(`reviewComment-${orderId}`)?.value.trim() || "";

        if (!rating || rating < 1 || rating > 5) {
            alert("Choisis une note entre 1 et 5.");
            return;
        }

        if (!comment) {
            alert("Le commentaire est obligatoire.");
            return;
        }

        const res = await fetch(`/api/reviews`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                rating,
                comment
            })
        });

        const result = await res.json().catch(() => null);

        if (!res.ok || !result?.success) {
            alert(result?.error || "Erreur lors de l'envoi de l'avis.");
            return;
        }

        alert("Avis envoyé avec succès.");
        loadOrders();
    }
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
