/* ============================================================================================================
                                                        DASHBOARD ADMIN
============================================================================================================ */


/* =================================
        ÉTAT GLOBAL
================================= */

/* chart Chart.js pour les stats */
let adminChart = null;

/* données en mémoire */
let currentAdminMenus = [];
let currentAdminOrders = [];
let currentAdminReviews = [];

/* =================================
        UTILITAIRES 
================================= */

/* fonction utilitaire pour sélectionner un élément DOM, pour éviter de répéter document.querySelector */
function qs(sel) {
    return document.querySelector(sel);
}

/* fonction d'échappement pour éviter les problèmes de sécurité liés à l'injection de code HTML dans les données affichées */
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* fonction utilitaire pour parser une réponse de l'API en JSON, avec gestion des erreurs de parsing et de format de réponse, pour éviter que l'application ne plante en cas de réponse mal formée ou d'erreur de l'API, et pour afficher des messages d'erreur clairs en cas de problème avec l'API */
async function parseJsonResponse(res) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!isJson) {
        const text = await res.text().catch(() => "");
        throw new Error(`Réponse non JSON (HTTP ${res.status}) : ${text.slice(0, 200)}`);
    }

    return await res.json().catch(() => {
        throw new Error("JSON invalide dans la réponse API.");
    });
}

/* fonction utilitaire pour obtenir le labeel d'un statut de commande à partir de son code, pour afficher des labels lisibles dans l'interface que les codes bruts retournés par l'API, ce qui améliore l'expérience utilisateur et la compréhension de l'état des commandes par l'admin */
function getStatusLabel(status) {
    const map = {
        ACCEPTED: "Acceptée",
        PREPARING: "En préparation",
        DELIVERING: "En livraison",
        DELIVERED: "Livrée",
        DONE: "Terminée",
        CANCELLED: "Annulée"
    }

    return map[status] || status;
}

/* =================================
        RÉFÉRENCES DOM
================================= */

/* éléments de statut et de détail */
const adminStatusEl = qs("#adminStatus");
/* élément de détail principal, utilisé pour afficher les détails d'un employé ou d'un menu sélectionné, ou les actions associées, ce qui permet d'avoir une zone de détail dynamique qui s'adapte au contexte de l'onglet actif et à l'élément sélectionné par l'admin */
const adminDetailEl = qs("#adminDetail");

/* les boutons d'onglets : on les utilise pour gérer l'affichage des panneaux correspondants */
const tabButtons = document.querySelectorAll(".employee-tab-btn");
/* les panneaux d'affichage des commandes, menus et avis : on affiche celui qui correspond à l'onglet actif, et on cache les autres */
const tabPanels = document.querySelectorAll(".employee-tab-panel");

const adminMenuDetailEl = qs("#adminMenuDetail");

const createAdminMenuBtn = qs("#createAdminMenuBtn");
createAdminMenuBtn?.addEventListener("click", () => {
    renderAdminMenuCreateForm();
});

/* employés */
const employeesWrap = qs("#employeesWrap");
const createEmployeeForm = qs("#createEmployeeForm");
const createMsgEl = qs("#createMsg");
const empEmailEl = qs("#empEmail");
const empPasswordEl = qs("#empPassword");

/* stats */
const statRevenueTotalEl = qs("#statRevenueTotal");
const statOrdersTotalEl = qs("#statOrdersTotal");
const statRevenueMonthEl = qs("#statRevenueMonth");
const statOrdersMonthEl = qs("#statOrdersMonth");
const statRevenueTodayEl = qs("#statRevenueToday");
const statOrdersTodayEl = qs("#statOrdersToday");
const statsHistoryWrapEl = qs("#statsHistoryWrap");
const revenueChartCanvas = qs("#revenueChart");

/* placeholders */
const ordersGrid = qs("#ordersGrid");
const menusGrid = qs("#menusGrid");
const reviewsGrid = qs("#reviewsGrid");

/* =================================
        UTILITAIRES
================================= */

function setStatus(text, ok = true) {
    if (!adminStatusEl) return;
    adminStatusEl.textContent = text;
    adminStatusEl.style.color = ok ? "" : "#b91c1c";
}

function setCreateMsg(text, ok = true) {
    if (!createMsgEl) return;
    createMsgEl.textContent = text;
    createMsgEl.className = ok ? "msg ok" : "msg error";
}

function formatEuro(value) {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR"
    }).format(Number(value || 0));
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function formatMenuStatus(menu) {
    return menu?.isActive ? "Actif" : "Inactif";
}

function getDishTypeLabel(type) {
    switch (String(type || "").toLowerCase()) {
        case "starter": return "Entrée";
        case "main": return "Plat";
        case "dessert": return "Dessert";
        default: return type || "Non précisé";
    }
}

async function api(path, options = {}) {
    const res = await fetch(path, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const data = await parseJsonResponse(res);

    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
    }

    return data;
}

/* =================================
        NAVIGATION PAR ONGLETS
================================= */

function activateTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    tabPanels.forEach(panel => {
        panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });

    if (adminDetailEl) {
        adminDetailEl.style.display =
            tabName === "employees" || tabName === "orders" || tabName === "reviews"
                ? ""
                : "none";
    }

    if (adminMenuDetailEl) {
        adminMenuDetailEl.style.display = tabName === "menus" ? "" : "none";
    }
}

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        activateTab(btn.dataset.tab);
    });
});

/* =================================
        EMPLOYÉS
================================= */

function normalizeEmployees(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.employees)) return payload.employees;
    if (payload && payload.data && Array.isArray(payload.data)) return payload.data;
    return [];
}

function renderEmployeeDetail(employee) {
    if (!adminDetailEl) return;

    const active = employee.isActive ?? employee.active ?? employee.enabled ?? true;

    adminDetailEl.innerHTML = `
        <div class="employee-detail-grid">
            <div class="employee-detail-box">
                <h3>Employé</h3>
                <p><strong>Email :</strong> ${escapeHtml(employee.email ?? "—")}</p>
                <p><strong>ID :</strong> ${escapeHtml(employee.id ?? employee.employeeId ?? "—")}</p>
                <p><strong>Statut :</strong> ${active ? "Actif" : "Suspendu"}</p>
            </div>

            <div class="employee-detail-box">
                <h3>Compte</h3>
                <p><strong>Rôle :</strong> Employé</p>
                <p><strong>Accès :</strong> Back-office</p>
            </div>

            <div class="employee-detail-box">
                <h3>Actions</h3>
                <div class="employee-actions">
                    <button class="btn secondary"
                            type="button"
                            data-employee-action="toggle"
                            data-id="${escapeHtml(employee.id ?? employee.employeeId ?? "")}">
                        ${active ? "Suspendre" : "Réactiver"}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderEmployees(list) {
    if (!employeesWrap) return;

    if (!list.length) {
        employeesWrap.innerHTML = `<div class="muted">Aucun employé.</div>`;
        return;
    }

    employeesWrap.innerHTML = `
        <div class="employees-grid">
            ${list.map(employee => {
        const id = employee.id ?? employee.employeeId ?? "";
        const email = escapeHtml(employee.email ?? "");
        const active = employee.isActive ?? employee.active ?? employee.enabled ?? true;

        return `
                    <article class="employee-card employee-mini-card"
                             data-type="employee"
                             data-id="${escapeHtml(id)}">
                        <h3>${email}</h3>
                        <p>${active ? "Actif" : "Suspendu"}</p>
                        <p class="muted small">ID : ${escapeHtml(id)}</p>
                    </article>
                `;
    }).join("")}
        </div>
    `;

    if (list.length) {
        renderEmployeeDetail(list[0]);
    }
}

async function loadEmployees() {
    const data = await api("/api/admin/employees", { method: "GET" });
    const list = normalizeEmployees(data);
    renderEmployees(list);
    setStatus(`${list.length} employé(s)`);
    return list;
}

async function handleToggleEmployee(employeeId) {
    await api(`/api/admin/employees/${encodeURIComponent(employeeId)}/toggle`, {
        method: "PATCH"
    });

    await loadEmployees();
    setStatus("Statut employé mis à jour");
}

createEmployeeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = empEmailEl?.value.trim() ?? "";
    const password = empPasswordEl?.value ?? "";

    if (!email || !password) {
        setCreateMsg("Email et mot de passe obligatoires.", false);
        return;
    }

    try {
        await api("/api/admin/employees", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        setCreateMsg("Employé créé avec succès.");
        createEmployeeForm.reset();
        await loadEmployees();
    } catch (err) {
        setCreateMsg(`Erreur : ${err.message}`, false);
    }
});

/* =================================
        COMMANDES ADMIN
================================= */

async function loadAdminOrders() {
    const res = await fetch('/api/employee/orders', {
        credentials: 'include'
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const result = isJson
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    if (!isJson) {
        throw new Error("La route /api/employee/orders ne renvoie pas du JSON.");
    }

    if (Array.isArray(result)) {
        return result;
    }

    if (result?.success && Array.isArray(result.orders)) {
        return result.orders;
    }

    if (result?.success && Array.isArray(result.data)) {
        return result.data;
    }

    throw new Error("Format de réponse invalide pour les commandes admin.");
}

function renderAdminOrdersCards(list) {
    if (!ordersGrid) return;

    if (!list.length) {
        ordersGrid.innerHTML = `<div class="muted">Aucune commande.</div>`;
        return;
    }

    ordersGrid.innerHTML = list.map(order => `
        <article class="employee-mini-card dashboard-item-card order-card" data-type="admin-order" data-id="${escapeHtml(order.id)}">
            <h3>Commande #${escapeHtml(order.id)}</h3>

            <p><strong>Client :</strong> ${escapeHtml(order.customerEmail ?? "Client inconnu")}</p>
            <p><strong>Menu :</strong> ${escapeHtml(order.menu?.title ?? "Menu inconnu")}</p>
            <p><strong>Personnes :</strong> ${escapeHtml(order.persons ?? "—")} pers.</p>
            <p><strong>Statut :</strong> ${escapeHtml(getStatusLabel(order.status ?? "—"))}</p>

            <div class="card-actions">
                <button class="btn" type="button" data-type="admin-order" data-id="${escapeHtml(order.id)}">
                    Voir / traiter
                </button>
            </div>
        </article>
    `).join("");
}

function renderAdminOrderDetail(order) {
    if (!adminDetailEl) return;

    const isLocked = order.status === "CANCELLED" || order.status === "DONE";

    adminDetailEl.innerHTML = `
        <div class="employee-detail-grid">
            <div class="employee-detail-box">
                <h3>Commande #${escapeHtml(order.id)}</h3>
                <p><strong>Client :</strong> ${escapeHtml(order.customerEmail ?? "Inconnu")}</p>
                <p><strong>Ville :</strong> ${escapeHtml(order.eventCity ?? "—")}</p>
                <p><strong>Adresse :</strong> ${escapeHtml(order.eventAddress ?? "—")}</p>
            </div>

            <div class="employee-detail-box">
                <h3>Informations commande</h3>
                <p><strong>Menu :</strong> ${escapeHtml(order.menu?.title ?? "—")}</p>
                <p><strong>Nombre de personnes :</strong> ${escapeHtml(order.persons ?? "—")}</p>
                <p><strong>Statut :</strong> ${escapeHtml(getStatusLabel(order.status ?? "—"))}</p>
                <p><strong>Date prestation :</strong> ${escapeHtml(order.eventDate ?? "—")}</p>
                <p><strong>Prix total :</strong> ${escapeHtml(order.totalPrice ?? "—")} €</p>
            </div>

            <div class="employee-detail-box">
                <h3>Suivi</h3>
                <p><strong>Créée le :</strong> ${escapeHtml(order.createdAt ?? "—")}</p>

                <div class="employee-actions">
                    <button class="btn secondary" type="button" data-order-action="accept" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Accepter</button>
                    <button class="btn secondary" type="button" data-order-action="preparing" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Préparation</button>
                    <button class="btn secondary" type="button" data-order-action="delivering" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Livraison</button>
                    <button class="btn secondary" type="button" data-order-action="done" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Terminée</button>
                    <button class="btn secondary" type="button" data-order-action="toggle-cancel" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Refuser</button>
                </div>

                <div id="cancelOrderBox" class="cancel-order-box" style="display:none; margin-top:16px;">
                    <h4 style="margin:0 0 10px 0;">Refuser / annuler la commande</h4>

                    <div class="field">
                        <label for="cancelContactMode">Mode de contact</label>
                        <select id="cancelContactMode">
                            <option value="">Choisir</option>
                            <option value="GSM">Appel GSM</option>
                            <option value="MAIL">Mail</option>
                        </select>
                    </div>

                    <div class="field" style="margin-top:10px;">
                        <label for="cancelReason">Motif</label>
                        <textarea id="cancelReason" rows="4" placeholder="Préciser le motif d'annulation..."></textarea>
                    </div>

                    <div class="employee-actions" style="margin-top:12px;">
                        <button class="btn secondary" type="button" data-order-action="confirm-cancel" data-id="${escapeHtml(order.id)}" ${isLocked ? "disabled" : ""}>Confirmer le refus</button>
                    </div>

                    <div id="cancelOrderMsg" class="msg" style="margin-top:10px;"></div>
                </div>
            </div>
        </div>
    `;
}

function refreshAdminOrdersView() {
    renderAdminOrdersCards(currentAdminOrders);

    if (currentAdminOrders.length) {
        renderAdminOrderDetail(currentAdminOrders[0]);
        setStatus(`${currentAdminOrders.length} commande(s) affichée(s)`);
    } else if (adminDetailEl) {
        adminDetailEl.innerHTML = `<div class="muted">Aucune commande disponible.</div>`;
        setStatus("Aucune commande trouvée");
    }
}

async function handleAdminOrderStatusUpdate(orderId, status) {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ status })
    });

    const result = await parseJsonResponse(res);

    if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Impossible de mettre à jour le statut");
    }

    setStatus(`Commande #${orderId} mise à jour : ${result.status ?? status}`);

    currentAdminOrders = await loadAdminOrders();
    refreshAdminOrdersView();

    const updatedOrder = currentAdminOrders.find(order => String(order.id) === String(orderId));
    if (updatedOrder) {
        renderAdminOrderDetail(updatedOrder);
    }
}

async function handleAdminOrderCancel(orderId, contactMode, reason) {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            contactMode,
            reason
        })
    });

    const result = await parseJsonResponse(res);

    if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Impossible de refuser la commande");
    }

    setStatus("Commande refusée");

    currentAdminOrders = await loadAdminOrders();
    refreshAdminOrdersView();

    const updatedOrder = currentAdminOrders.find(order => String(order.id) === String(orderId));
    if (updatedOrder) {
        renderAdminOrderDetail(updatedOrder);
    }
}

/* =================================
        MENUS ADMIN
================================= */

async function loadAdminMenus() {
    const res = await fetch('/api/admin/menus', {
        credentials: 'include'
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const result = isJson
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    if (!isJson) {
        throw new Error("La route /api/admin/menus ne renvoie pas du JSON.");
    }

    if (Array.isArray(result)) {
        return result;
    }

    if (result?.success && Array.isArray(result.items)) {
        return result.items;
    }

    if (result?.success && Array.isArray(result.data)) {
        return result.data;
    }

    throw new Error("Format de réponse invalide pour les menus admin.");
}

function refreshAdminMenusView() {
    renderAdminMenusCards(currentAdminMenus);

    if (currentAdminMenus.length) {
        renderAdminMenuDetail(currentAdminMenus[0]);
        setStatus(`${currentAdminMenus.length} menu(s) affiché(s)`);
    } else if (adminMenuDetailEl) {
        adminMenuDetailEl.innerHTML = `
        <div class="employee-detail-card">
            <h3>Menus</h3>
            <p>Aucun menu disponible.</p>
            <div class="employee-detail-actions" style="margin-top:16px;">
                <button class="btn secondary" type="button" id="emptyCreateAdminMenuBtn">
                    Ajouter un menu
                </button>
            </div>
        </div>
    `;

        const emptyCreateBtn = document.getElementById("emptyCreateAdminMenuBtn");
        emptyCreateBtn?.addEventListener("click", () => {
            renderAdminMenuCreateForm();
        });

        setStatus("Aucun menu trouvé");
    }
}

function renderAdminMenusCards(list) {
    if (!menusGrid) return;

    if (!list.length) {
        menusGrid.innerHTML = `<div class="muted">Aucun menu.</div>`;
        return;
    }

    menusGrid.innerHTML = list.map(menu => `
        <article class="employee-mini-card dashboard-item-card admin-menu-card" data-type="admin-menu" data-id="${escapeHtml(menu.id)}">
            <h3>${escapeHtml(menu.title ?? "Menu sans nom")}</h3>

            <p><strong>Thème :</strong> ${escapeHtml(menu.theme ?? "—")}</p>
            <p><strong>Régime :</strong> ${escapeHtml(menu.regime ?? "—")}</p>
            <p><strong>Stock :</strong> ${escapeHtml(menu.stock ?? "—")}</p>
            <p><strong>Prix :</strong> ${escapeHtml(menu.price ?? menu.basePrice ?? "—")} €</p>
            <p><strong>Statut :</strong> ${escapeHtml(menu.isActive ? "Actif" : "Inactif")}</p>

            <div class="card-actions">
                <button class="btn" type="button" data-type="admin-menu" data-id="${escapeHtml(menu.id)}">
                    Voir
                </button>
                <button class="btn secondary" type="button" data-menu-action="edit" data-id="${escapeHtml(menu.id)}">
                    Modifier
                </button>
                <button class="btn secondary" type="button" data-menu-action="toggle-active" data-id="${escapeHtml(menu.id)}">
                    ${menu.isActive ? "Désactiver" : "Réactiver"}
                </button>
                <button class="btn secondary" type="button" data-menu-action="delete" data-id="${escapeHtml(menu.id)}">
                    Supprimer
                </button>
            </div>
        </article>
    `).join("");
}

function renderAdminMenuDetail(menu) {
    if (!adminMenuDetailEl) return;

    adminMenuDetailEl.innerHTML = `
        <div class="employee-detail-card">
            <h3>${escapeHtml(menu.title ?? "Menu sans nom")}</h3>

            <p><strong>Description :</strong> ${escapeHtml(menu.description ?? "Aucune description")}</p>
            <p><strong>Thème :</strong> ${escapeHtml(menu.theme ?? "Aucun thème")}</p>
            <p><strong>Régime :</strong> ${escapeHtml(menu.regime ?? "Aucun régime")}</p>
            <p><strong>Entrée :</strong> ${escapeHtml(menu.starter ?? "—")}</p>
            <p><strong>Plat principal :</strong> ${escapeHtml(menu.main ?? "—")}</p>
            <p><strong>Dessert :</strong> ${escapeHtml(menu.dessert ?? "—")}</p>
            <p><strong>Allergènes :</strong> ${escapeHtml((menu.allergens ?? []).join(", ") || "Aucun")}</p>
            <p><strong>Nombre de personnes minimum :</strong> ${escapeHtml(menu.minPersons ?? "—")}</p>
            <p><strong>Prix de base :</strong> ${escapeHtml(menu.basePrice ?? "—")} €</p>
            <p><strong>Stock :</strong> ${escapeHtml(menu.stock ?? "—")}</p>
            <p><strong>Statut :</strong> ${menu.isActive ? "Actif" : "Inactif"}</p>

            <div class="employee-detail-actions">
                <button class="btn secondary" type="button"
                        data-menu-action="edit"
                        data-id="${escapeHtml(menu.id)}">
                    Modifier
                </button>

                <button class="btn secondary" type="button"
                        data-menu-action="toggle-active"
                        data-id="${escapeHtml(menu.id)}">
                    ${menu.isActive ? "Désactiver" : "Activer"}
                </button>

                <button class="btn secondary" type="button"
                        data-menu-action="delete"
                        data-id="${escapeHtml(menu.id)}">
                    Supprimer
                </button>
            </div>
        </div>
    `;
}

function renderAdminMenuCreateForm() {
    if (!adminMenuDetailEl) return;

    adminMenuDetailEl.innerHTML = `
        <div class="employee-detail-card">
            <h3>Ajouter un menu</h3>

            <div class="field">
                <label for="newAdminMenuTitle">Titre</label>
                <input id="newAdminMenuTitle" type="text" placeholder="Nom du menu">
            </div>

            <div class="field">
                <label for="newAdminMenuDescription">Description</label>
                <textarea id="newAdminMenuDescription" rows="4" placeholder="Description du menu"></textarea>
            </div>

            <div class="field">
                <label for="newAdminMenuTheme">Thème</label>
                <input id="newAdminMenuTheme" type="text" placeholder="Ex: Mariage">
            </div>

            <div class="field">
                <label for="newAdminMenuRegime">Régime</label>
                <select id="newAdminMenuRegime">
                    <option value="NONE">Aucun</option>
                    <option value="VEGETARIAN">Végétarien</option>
                    <option value="HALAL">Halal</option>
                    <option value="GLUTEN_FREE">Sans gluten</option>
                </select>
            </div>

            <div class="field">
                <label for="newAdminMenuAllergens">Allergènes (séparés par des virgules)</label>
                <input id="newAdminMenuAllergens" type="text" placeholder="Ex: Arachides, Fruits de mer">
            </div>

            <div class="field">
                <label for="newAdminMenuStarter">Entrée</label>
                <input id="newAdminMenuStarter" type="text" placeholder="Ex: Salade César">
            </div>

            <div class="field">
                <label for="newAdminMenuMain">Plat principal</label>
                <input id="newAdminMenuMain" type="text" placeholder="Ex: Filet de boeuf">
            </div>

            <div class="field">
                <label for="newAdminMenuDessert">Dessert</label>
                <input id="newAdminMenuDessert" type="text" placeholder="Ex: Tarte au chocolat">
            </div>

            <div class="field">
                <label for="newAdminMenuMinPersons">Nombre de personnes minimum</label>
                <input id="newAdminMenuMinPersons" type="number" min="1" placeholder="1">
            </div>

            <div class="field">
                <label for="newAdminMenuStock">Stock</label>
                <input id="newAdminMenuStock" type="number" min="0" placeholder="0">
            </div>

            <div class="field">
                <label for="newAdminMenuBasePrice">Prix de base (€)</label>
                <input id="newAdminMenuBasePrice" type="number" min="0" step="0.01" placeholder="0.00">
            </div>

            <div class="employee-detail-actions" style="margin-top:16px;">
                <button class="btn secondary" type="button" id="saveNewAdminMenuBtn">
                    Créer le menu
                </button>
            </div>
        </div>
    `;

    const saveBtn = document.getElementById("saveNewAdminMenuBtn");

    saveBtn?.addEventListener("click", async () => {
        const title = document.getElementById("newAdminMenuTitle")?.value.trim() ?? "";
        const description = document.getElementById("newAdminMenuDescription")?.value.trim() ?? "";
        const theme = document.getElementById("newAdminMenuTheme")?.value.trim() ?? "";
        const regime = document.getElementById("newAdminMenuRegime")?.value.trim() ?? "";
        const starter = document.getElementById("newAdminMenuStarter")?.value.trim() ?? "";
        const main = document.getElementById("newAdminMenuMain")?.value.trim() ?? "";
        const dessert = document.getElementById("newAdminMenuDessert")?.value.trim() ?? "";
        const allergensRaw = document.getElementById("newAdminMenuAllergens")?.value.trim() ?? "";
        const allergens = allergensRaw
            .split(",")
            .map(a => a.trim())
            .filter(a => a !== "");

        const rawMinPersons = document.getElementById("newAdminMenuMinPersons")?.value;
        const minPersons = rawMinPersons ? Number(rawMinPersons) : 1;
        const basePrice = Number(document.getElementById("newAdminMenuBasePrice")?.value ?? 0);
        const stock = Number(document.getElementById("newAdminMenuStock")?.value ?? 0);

        if (!title) {
            setStatus("Le titre est obligatoire.", false);
            return;
        }

        if (Number.isNaN(basePrice)) {
            setStatus("Le prix doit être un nombre valide.", false);
            return;
        }

        if (Number.isNaN(stock)) {
            setStatus("Le stock doit être un nombre valide.", false);
            return;
        }

        try {
            const res = await fetch('/api/admin/menus', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    theme,
                    regime,
                    starter,
                    main,
                    dessert,
                    allergens,
                    minPersons,
                    basePrice,
                    stock,
                    isActive: true
                })
            });

            const result = await parseJsonResponse(res);

            if (!res.ok || !result?.success) {
                throw new Error(result?.error || `HTTP ${res.status}`);
            }

            setStatus("Menu créé avec succès.");

            currentAdminMenus = await loadAdminMenus();
            refreshAdminMenusView();

            const createdMenu = result.item;
            if (createdMenu) {
                renderAdminMenuDetail(createdMenu);
            }
        } catch (err) {
            setStatus(`Erreur création menu : ${err.message}`, false);
        }
    });
}

async function handleEditAdminMenu(menuId) {
    const selectedMenu = currentAdminMenus.find(menu => String(menu.id) === String(menuId));

    if (!selectedMenu) {
        setStatus("Menu introuvable.", false);
        return;
    }

    const newTitle = window.prompt("Nom du menu :", selectedMenu.title ?? "");
    if (newTitle === null) return;

    const newDescription = window.prompt("Description :", selectedMenu.description ?? "");
    if (newDescription === null) return;

    const newTheme = window.prompt("Thème :", selectedMenu.theme ?? "");
    if (newTheme === null) return;

    const newRegime = window.prompt("Régime :", selectedMenu.regime ?? "");
    if (newRegime === null) return;

    const newBasePriceRaw = window.prompt("Prix de base :", selectedMenu.basePrice ?? 0);
    if (newBasePriceRaw === null) return;

    const newStockRaw = window.prompt("Stock :", selectedMenu.stock ?? 0);
    if (newStockRaw === null) return;

    const newBasePrice = Number(newBasePriceRaw);
    const newStock = Number(newStockRaw);

    if (Number.isNaN(newBasePrice)) {
        setStatus("Le prix doit être un nombre valide.", false);
        return;
    }

    if (Number.isNaN(newStock)) {
        setStatus("Le stock doit être un nombre valide.", false);
        return;
    }

    try {
        const res = await fetch(`/api/admin/menus/${encodeURIComponent(menuId)}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                title: newTitle,
                description: newDescription,
                theme: newTheme,
                regime: newRegime,
                basePrice: newBasePrice,
                stock: newStock
            })
        });

        const result = await parseJsonResponse(res);

        if (!res.ok || !result?.success) {
            throw new Error(result?.error || `HTTP ${res.status}`);
        }

        setStatus(`Menu #${menuId} modifié avec succès.`);

        currentAdminMenus = await loadAdminMenus();
        refreshAdminMenusView();

        const updatedMenu = currentAdminMenus.find(menu => String(menu.id) === String(menuId));
        if (updatedMenu) {
            renderAdminMenuDetail(updatedMenu);
        }
    } catch (err) {
        setStatus(`Erreur modification menu : ${err.message}`, false);
    }
}

async function handleDeleteAdminMenu(menuId) {
    const confirmed = window.confirm("Voulez-vous vraiment supprimer ce menu ?");
    if (!confirmed) return;

    try {
        const res = await fetch(`/api/admin/menus/${encodeURIComponent(menuId)}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        let result = null;
        try {
            result = await parseJsonResponse(res);
        } catch {
            result = null;
        }

        if (!res.ok) {
            throw new Error(result?.error || `HTTP ${res.status}`);
        }

        setStatus(`Menu #${menuId} supprimé avec succès.`);

        currentAdminMenus = await loadAdminMenus();
        refreshAdminMenusView();

    } catch (err) {
        setStatus(`Erreur suppression menu : ${err.message}`, false);
    }
}

async function handleToggleAdminMenuActive(menuId) {
    const menu = currentAdminMenus.find(m => String(m.id) === String(menuId));
    if (!menu) return;

    const newState = !menu.isActive;

    try {
        const res = await fetch(`/api/admin/menus/${encodeURIComponent(menuId)}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ isActive: newState })
        });

        const result = await parseJsonResponse(res);

        if (!res.ok || !result?.success) {
            throw new Error(result?.error || "Erreur mise à jour menu");
        }

        setStatus("Statut du menu mis à jour");

        currentAdminMenus = await loadAdminMenus();
        refreshAdminMenusView();

        const updatedMenu = currentAdminMenus.find(m => String(m.id) === String(menuId));
        if (updatedMenu) {
            renderAdminMenuDetail(updatedMenu);
        }
    } catch (err) {
        setStatus(err.message, false);
    }
}

/* =================================
        ÉVÉNEMENTS GLOBAUX
================================= */

adminDetailEl?.addEventListener("click", async (e) => {
    const employeeBtn = e.target.closest("[data-employee-action]");
    if (!employeeBtn) return;

    const action = employeeBtn.dataset.employeeAction;
    const id = employeeBtn.dataset.id;

    if (!id) return;

    if (action === "toggle") {
        try {
            employeeBtn.disabled = true;
            await handleToggleEmployee(id);
        } catch (err) {
            setStatus(`Erreur employé : ${err.message}`, false);
        } finally {
            employeeBtn.disabled = false;
        }
    }
});

adminDetailEl?.addEventListener("click", async (e) => {
    const orderBtn = e.target.closest("[data-order-action]");
    if (!orderBtn) return;

    const action = orderBtn.dataset.orderAction;
    const id = orderBtn.dataset.id;

    if (!id) return;

    try {
        orderBtn.disabled = true;

        if (action === "toggle-cancel") {
            const box = document.getElementById("cancelOrderBox");
            if (!box) return;

            box.style.display = box.style.display === "none" ? "block" : "none";
            return;
        }

        if (action === "confirm-cancel") {
            const contactMode = document.getElementById("cancelContactMode")?.value ?? "";
            const reason = document.getElementById("cancelReason")?.value.trim() ?? "";
            const msgEl = document.getElementById("cancelOrderMsg");

            if (!contactMode || !reason) {
                if (msgEl) {
                    msgEl.textContent = "Le mode de contact et le motif sont obligatoires.";
                    msgEl.className = "msg error";
                }
                return;
            }

            await handleAdminOrderCancel(id, contactMode, reason);

            if (msgEl) {
                msgEl.textContent = "Commande refusée.";
                msgEl.className = "msg ok";
            }

            return;
        }

        if (action === "accept") {
            await handleAdminOrderStatusUpdate(id, "ACCEPTED");
            return;
        }

        if (action === "preparing") {
            await handleAdminOrderStatusUpdate(id, "PREPARING");
            return;
        }

        if (action === "delivering") {
            await handleAdminOrderStatusUpdate(id, "DELIVERING");
            return;
        }

        if (action === "done") {
            await handleAdminOrderStatusUpdate(id, "DONE");
            return;
        }
    } catch (err) {
        setStatus(`Erreur commande : ${err.message}`, false);
    } finally {
        orderBtn.disabled = false;
    }
});

adminMenuDetailEl?.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest("[data-menu-action]");
    if (!menuBtn) return;

    const action = menuBtn.dataset.menuAction;
    const id = menuBtn.dataset.id;

    try {
        menuBtn.disabled = true;

        if (action === "edit" && id) {
            await handleEditAdminMenu(id);
            return;
        }

        if (action === "toggle-active" && id) {
            await handleToggleAdminMenuActive(id);
            return;
        }

        if (action === "delete" && id) {
            await handleDeleteAdminMenu(id);
            return;
        }
    } catch (err) {
        setStatus(`Erreur menu : ${err.message}`, false);
    } finally {
        menuBtn.disabled = false;
    }
});

document.addEventListener("click", async (e) => {
    const employeeCard = e.target.closest('.employee-mini-card[data-type="employee"]');
    if (employeeCard) {
        const id = employeeCard.dataset.id;
        if (!id) return;

        try {
            const data = await api("/api/admin/employees", { method: "GET" });
            const employees = normalizeEmployees(data);
            const employee = employees.find(item => String(item.id ?? item.employeeId) === String(id));

            if (employee) {
                renderEmployeeDetail(employee);
            }
        } catch (err) {
            setStatus(`Erreur chargement employé : ${err.message}`, false);
        }

        return;
    }

    const orderCard = e.target.closest('.employee-mini-card[data-type="admin-order"]');
    if (orderCard) {
        const id = orderCard.dataset.id;
        if (!id) return;

        const order = currentAdminOrders.find(item => String(item.id) === String(id));
        if (order) {
            renderAdminOrderDetail(order);
            setStatus(`Commande sélectionnée : #${order.id}`);
        }

        return;
    }

    const menuCard = e.target.closest('.employee-mini-card[data-type="admin-menu"]');
    if (menuCard) {
        const id = menuCard.dataset.id;
        if (!id) return;

        const menu = currentAdminMenus.find(item => String(item.id) === String(id));
        if (menu) {
            renderAdminMenuDetail(menu);
            setStatus(`Menu sélectionné : ${menu.title ?? menu.id}`);
        }

        return;
    }
});

/* =================================
        STATISTIQUES
================================= */

async function loadAdminStats() {
    const result = await api("/api/admin/stats", {
        method: "GET"
    });

    const data = result.data ?? {};

    if (statRevenueTotalEl) statRevenueTotalEl.textContent = formatEuro(data.revenueTotal);
    if (statOrdersTotalEl) statOrdersTotalEl.textContent = data.ordersTotal ?? "0";

    if (statRevenueMonthEl) statRevenueMonthEl.textContent = formatEuro(data.revenueMonth);
    if (statOrdersMonthEl) statOrdersMonthEl.textContent = data.ordersMonth ?? "0";

    if (statRevenueTodayEl) statRevenueTodayEl.textContent = formatEuro(data.revenueToday);
    if (statOrdersTodayEl) statOrdersTodayEl.textContent = data.ordersToday ?? "0";
}

function renderRevenueChart(data) {
    if (!revenueChartCanvas || typeof Chart === "undefined" || !Array.isArray(data) || !data.length) {
        return;
    }

    if (adminChart) {
        adminChart.destroy();
    }

    const labels = data.map(item => item.date);
    const revenue = data.map(item => Number(item.revenue || 0));

    adminChart = new Chart(revenueChartCanvas, {
        type: "line",
        data: {
            labels,
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

async function loadAdminStatsHistory() {
    const result = await api("/api/admin/stats/history", {
        method: "GET"
    });

    const data = result.data ?? [];

    renderRevenueChart(data);

    if (!statsHistoryWrapEl) return;

    if (!data.length) {
        statsHistoryWrapEl.innerHTML = `<div class="muted">Aucun snapshot disponible.</div>`;
        return;
    }

    statsHistoryWrapEl.innerHTML = `
        <div class="history-list">
            ${data.map(item => `
                <div class="history-item">
                    <div class="history-line">
                        <strong>${escapeHtml(item.date)}</strong>
                        <span>CA : ${formatEuro(item.revenue)}</span>
                        <span>Commandes : ${escapeHtml(item.orders)}</span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

/* =================================
        PLACEHOLDERS TEMPORAIRES
================================= */

async function initAdminOrders() {
    if (!ordersGrid) return;

    ordersGrid.innerHTML = `<div class="muted">Chargement des commandes admin...</div>`;

    const orders = await loadAdminOrders();
    currentAdminOrders = orders;
    refreshAdminOrdersView();
}

async function initMenusPlaceholder() {
    if (!menusGrid) return;

    menusGrid.innerHTML = `<div class="muted">Chargement des menus admin...</div>`;

    const menus = await loadAdminMenus();
    currentAdminMenus = menus;
    refreshAdminMenusView();
}

function initReviewsPlaceholder() {
    if (!reviewsGrid) return;
    reviewsGrid.innerHTML = `
        <div class="muted">
            Bloc avis admin à brancher ensuite.
        </div>
    `;
}

/* =================================
        INITIALISATION
================================= */

(async function initAdminDashboard() {
    activateTab("employees");

    initReviewsPlaceholder();

    let hasError = false;

    try {
        await loadEmployees();
    } catch (err) {
        hasError = true;
        setStatus(`Erreur employés : ${err.message}`, false);
    }

    try {
        await initAdminOrders();
    } catch (err) {
        hasError = true;
        if (ordersGrid) {
            ordersGrid.innerHTML = `<div class="muted">Erreur chargement commandes : ${escapeHtml(err.message)}</div>`;
        }
        setStatus(`Erreur commandes : ${err.message}`, false);
    }

    try {
        await loadAdminStats();
    } catch (err) {
        hasError = true;
        setStatus(`Erreur statistiques : ${err.message}`, false);
    }

    try {
        await loadAdminStatsHistory();
    } catch (err) {
        hasError = true;
        setStatus(`Erreur historique stats : ${err.message}`, false);
    }

    try {
        await initMenusPlaceholder();
    } catch (err) {
        hasError = true;
        if (menusGrid) {
            menusGrid.innerHTML = `<div class="muted">Erreur chargement menus : ${escapeHtml(err.message)}</div>`;
        }
        setStatus(`Erreur menus : ${err.message}`, false);
    }

    if (!hasError) {
        setStatus("Espace administrateur prêt");
    }
})();
