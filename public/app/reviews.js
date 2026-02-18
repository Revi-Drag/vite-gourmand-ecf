const API_BASE = ""; // même domaine

const els = {
    grid: document.getElementById("reviewsGrid"),
    status: document.getElementById("reviewsStatus"),
};

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderStars(n) {
    const v = Math.max(1, Math.min(5, Number(n || 0)));
    return "★".repeat(v) + "☆".repeat(5 - v);
}

function renderReviews(reviews) {
    if (!reviews.length) {
        els.grid.innerHTML = `<div class="muted">Aucun avis pour le moment.</div>`;
        return;
    }

    els.grid.innerHTML = reviews
        .map((r) => {
            return `
        <article class="review-card" tabindex="0" aria-label="Avis ${r.rating} sur 5">
          <div class="review-top">
            <div class="review-stars" aria-hidden="true">${renderStars(r.rating)}</div>
            <div class="review-date muted">${escapeHtml(r.createdAt || "")}</div>
          </div>
          <p class="review-comment">${escapeHtml(r.comment || "")}</p>
        </article>
      `;
        })
        .join("");
}

async function loadReviews() {
    try {
        els.status.textContent = "Chargement des avis…";
        const res = await fetch(`${API_BASE}/api/reviews`, { credentials: "include" });
        const data = await res.json();

        if (!res.ok || !data.success) {
            els.status.textContent = "Impossible de charger les avis.";
            renderReviews([]);
            return;
        }

        els.status.textContent = "";
        renderReviews(data.reviews || []);
    } catch (e) {
        els.status.textContent = "Erreur réseau lors du chargement des avis.";
        renderReviews([]);
    }
}

loadReviews();
