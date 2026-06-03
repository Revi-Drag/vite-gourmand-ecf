function qs(sel) { return document.querySelector(sel); }

const statusEl = qs("#status");
const wrap = qs("#employeesWrap");
const form = qs("#createEmployeeForm");
const msg = qs("#createMsg");

function setStatus(text, ok = true) {
    statusEl.textContent = text;
    statusEl.style.color = ok ? "" : "#b91c1c";
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
    const res = await fetch(path, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
    });

    // si backend renvoie HTML sur erreur, éviter JSON.parse qui pète
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
        const message = (data && data.error) ? data.error : `HTTP ${res.status}`;
        throw new Error(message);
    }
    return data;
}

function normalizeEmployees(payload) {
    // accepte:
    // - { employees: [...] }
    // - { success:true, employees:[...] }
    // - [...]
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.employees)) return payload.employees;
    if (payload && payload.data && Array.isArray(payload.data)) return payload.data;
    return [];
}

function renderEmployees(list) {
    if (!list.length) {
        wrap.innerHTML = `<div class="muted">Aucun employé.</div>`;
        return;
    }

    wrap.innerHTML = `
    <div class="employees-grid">
      ${list.map(e => {
        const id = e.id ?? e.employeeId ?? "";
        const email = escapeHtml(e.email ?? "");
        const active = (e.isActive ?? e.active ?? e.enabled ?? true);
        const badge = active
            ? `<span class="badge badge-done">Actif</span>`
            : `<span class="badge badge-todo">Suspendu</span>`;

        return `
          <div class="employee-card">
            <div class="row" style="align-items:baseline">
              <div>
                <div style="font-weight:900">${email} ${badge}</div>
                <div class="muted small">ID: ${escapeHtml(id)}</div>
              </div>

              <button class="btn secondary" data-action="toggle" data-id="${escapeHtml(id)}">
                ${active ? "Suspendre" : "Réactiver"}
              </button>
            </div>
          </div>
        `;
    }).join("")}
    </div>
  `;
}

async function loadEmployees() {
    setStatus("Chargement…");
    const data = await api("/api/admin/employees", { method: "GET" });
    const list = normalizeEmployees(data);
    renderEmployees(list);
    setStatus(`${list.length} employé(s)`);
}

wrap.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "toggle") {
        btn.disabled = true;
        try {
            await api(`/api/admin/employees/${encodeURIComponent(id)}/toggle`, { method: "PATCH" });
            await loadEmployees();
        } catch (err) {
            setStatus(`Erreur toggle: ${err.message}`, false);
        } finally {
            btn.disabled = false;
        }
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "msg";

    const email = qs("#empEmail").value.trim();
    const password = qs("#empPassword").value;

    try {
        await api("/api/admin/employees", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        msg.textContent = "Employé créé.";
        msg.classList.add("ok");
        form.reset();
        await loadEmployees();
    } catch (err) {
        msg.textContent = `Erreur: ${err.message}`;
        msg.classList.add("error");
    }
});

(async () => {
    try {
        await loadAdminStats();
        await loadAdminStatsHistory();
        await loadEmployees();
    } catch (err) {
        setStatus(`Erreur chargement: ${err.message}`, false);
    }
})();

function formatEuro(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(Number(value));
}

async function loadAdminStats() {

    const response = await fetch('/api/admin/stats', {
        credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || "Impossible de charger les statistiques");
    }

    const data = result.data;

    document.getElementById('statRevenueTotal').textContent = formatEuro(data.revenueTotal);
    document.getElementById('statOrdersTotal').textContent = data.ordersTotal;

    document.getElementById('statRevenueMonth').textContent = formatEuro(data.revenueMonth);
    document.getElementById('statOrdersMonth').textContent = data.ordersMonth;

    document.getElementById('statRevenueToday').textContent = formatEuro(data.revenueToday);
    document.getElementById('statOrdersToday').textContent = data.ordersToday;
}

async function loadAdminStatsHistory() {

    const historyWrap = document.getElementById('statsHistoryWrap');

    const response = await fetch('/api/admin/stats/history', {
        credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || "Impossible de charger l'historique");
    }

    const data = result.data ?? [];

    renderRevenueChart(data);

    if (!data.length) {
        historyWrap.textContent = "Aucun snapshot disponible.";
        return;
    }

    historyWrap.innerHTML = `
        <div class="history-list">
            ${data.map(item => `
                <div class="history-item">
                    <div class="history-line">
                        <strong>${item.date}</strong>
                        <span>CA : ${formatEuro(item.revenue)}</span>
                        <span>Commandes : ${item.orders}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRevenueChart(data) {

    const ctx = document.getElementById("revenueChart");

    if (!ctx || !data.length) return;

    const labels = data.map(d => d.date);
    const revenue = data.map(d => Number(d.revenue));

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Chiffre d'affaires (€)",
                data: revenue,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}