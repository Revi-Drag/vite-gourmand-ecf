/*====================================================================================================================================
                                                        DASHBOARD EMPLOYÉ
====================================================================================================================================*/


/* =================================
        ÉTAT GLOBAL
================================= */

/* les données chargées depuis l'API pour les commandes : on les stocke dans cette variable pour pouvoir les filtrer et les afficher dans le dashboard de l'employé, ce qui permet d'avoir une source de données centralisée pour le dashboard et de gérer efficacement l'affichage en fonction des interactions de l'employé (filtrage, sélection d'une carte, etc.) */
let currentReviews = [];
/* les données chargées depuis l'API pour les commandes : on les stocke dans cette variable pour pouvoir les filtrer et les afficher dans le dashboard de l'employé, ce qui permet d'avoir une source de données centralisée pour le dashboard et de gérer efficacement l'affichage en fonction des interactions de l'employé (filtrage, sélection d'une carte, etc.) */
let currentOrders = [];
/* les données chargées depuis l'API pour les menus : on les stocke dans cette variable pour pouvoir les filtrer et les afficher dans le dashboard de l'employé, ce qui permet d'avoir une source de données centralisée pour le dashboard et de gérer efficacement l'affichage en fonction des interactions de l'employé (filtrage, sélection d'une carte, etc.) */
let currentMenus = [];

/* ================================
        UTILITAIRES 
================================= */

/* fonction utilitaire pour sélectionner un élément dans le DOM, pour éviter de répéter document.querySelector à chaque fois */
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

/* fonction utilitaire pour obtenir le label d'un statut de commande à partir de son code, pour afficher des labels plus lisibles dans l'interface que les codes bruts retournés par l'API, ce qui améliore l'expérience utilisateur et la compréhension de l'état des commandes par l'employé */
function getStatusLabel(status) {
    const map = {
        ACCEPTED: "Acceptée",
        PREPARING: "En préparation",
        DELIVERING: "En livraison",
        DELIVERED: "Livrée",
        DONE: "Terminée",
        CANCELLED: "Annulée"
    };

    return map[status] || status;
}


/* =================================
        RÉFÉRENCES DOM
================================= */

/* les éléments du DOM dont on a besoin pour le dashboard de l'employé : on les sélectionne une fois au chargement de la page pour éviter de faire des sélections répétées à chaque interaction, ce qui améliore les performances et la lisibilité du code */
const orderStatusFilterEl = qs("#orderStatusFilter");
/* le champ de filtre par email du client : on l'utilise pour filtrer les commandes affichées en fonction de l'email du client, ce qui permet à l'employé de trouver rapidement les commandes d'un client spécifique et de gérer efficacement son travail */
const orderCustomerFilterEl = qs("#orderCustomerFilter");
/* le bouton d'application des filtres de commande : on l'utilise pour appliquer les filtres sélectionnés aux commandes affichées, en filtrant la liste des commandes chargées depuis l'API en fonction des critères sélectionnés (statut de la commande, email du client), ce qui permet à l'employé de trouver rapidement les commandes qui l'intéressent et de gérer efficacement son travail */
const applyOrderFiltersBtn = qs("#applyOrderFiltersBtn");
/* le bouton de réinitialisation des filtres de commande : on l'utilise pour réinitialiser les champs de filtre et afficher à nouveau toutes les commandes sans filtre */
const resetOrderFiltersBtn = qs("#resetOrderFiltersBtn");

/* le message de statut de l'employé : on l'utilise pour afficher des messages d'erreur ou de succès liés aux actions de l'employé */
const employeeStatusEl = qs("#employeeStatus");
/* le panneau de détail de l'employé : on affiche les infos détaillées d'une commande, d'un menu ou d'un avis quand on clique sur une carte correspondante */
const detailEl = qs("#employeeDetail");
/* le conteneur des onglets : on l'utilise pour gérer l'affichage des panneaux correspondants aux onglets de commandes, menus et avis, ce qui permet à l'employé de naviguer facilement entre les différentes sections du dashboard et de gérer efficacement son travail en fonction de ses besoins du moment */
const tabMenusEl = qs("#tab-menus");
/* les boutons d'onglet : on les utilise pour gérer l'affichage des panneaux correspondants */
const tabButtons = document.querySelectorAll(".employee-tab-btn");
/* les panneaux d'affichage des commandes, menus et avis : on affiche celui qui correspond à l'onglet actif, et on cache les autres */
const tabPanels = document.querySelectorAll(".employee-tab-panel");

/* les grilles d'affichage des commandes, menus et avis : on les remplit dynamiquement avec les données de l'API (ou les données de démonstration pour l'instant) */
const ordersGrid = qs("#ordersGrid");
/* les grilles d'affichage des commandes, menus et avis : on les remplit dynamiquement avec les données de l'API (ou les données de démonstration pour l'instant) */
const menusGrid = qs("#menusGrid");
/* les grilles d'affichage des commandes, menus et avis : on les remplit dynamiquement avec les données de l'API (ou les données de démonstration pour l'instant) */
const reviewsGrid = qs("#reviewsGrid");

/* le panneau de détail d'un menu : on affiche les infos détaillées d'un menu quand on clique sur une carte de menu, et on affiche un message d'erreur si aucun menu n'est trouvé ou si une erreur survient lors du chargement des menus, ce qui permet à l'employé d'avoir une vue à jour du détail du menu sélectionné et de gérer efficacement son travail en fonction de cette information */
const employeeMenuDetailEl = qs("#employeeMenuDetail");
/* le bouton de création d'un menu : on l'utilise pour ouvrir le formulaire de création d'un nouveau menu */
const createMenuBtn = qs("#createMenuBtn");
createMenuBtn?.addEventListener("click", () => {
    renderMenuCreateForm();
});

/* met à jour le message de statut de l'employé, avec une couleur rouge si c'est une erreur */
function setEmployeeStatus(text, ok = true) {
    employeeStatusEl.textContent = text;
    employeeStatusEl.style.color = ok ? "" : "#b91c1c";
}

/*==========================================
        NAVIGATION PAR ONGLETS
========================================= */

/* active un onglet en fonction de son nom, et met à jour le style du bouton actif */
function activateTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    tabPanels.forEach(panel => {
        panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });

    if (detailEl) {
        detailEl.style.display = tabName === "menus" ? "none" : "";
    }
}

/* gestion des onglets : on active le bon panneau et on met à jour le style du bouton actif */
tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        activateTab(btn.dataset.tab);
    });
});


/* ==============================================
        CHARGEMENT DES DONNÉES API
=============================================== */

/* ------------------------------
        Commandes
------------------------------ */

/* fonction de chargement des commandes de l'API, avec gestion des erreurs et du message de statut de l'employé */
async function loadEmployeeOrders() {
    const res = await fetch('/api/employee/orders', {
        credentials: 'include'
    });

    /* on récupère le content-type de la réponse de l'API pour vérifier que c'est du JSON, et éviter les erreurs de parsing si ce n'est pas le cas */
    const contentType = res.headers.get('content-type') || '';
    /* on vérifie que le content-type de la réponse de l'API est bien du JSON, pour éviter les erreurs de parsing et afficher un message d'erreur clair si ce n'est pas le cas */
    const isJson = contentType.includes('application/json');
    /* on essaie de parser la réponse en JSON si le content-type le permet, sinon on la traite comme du texte brut, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée */
    const result = isJson
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);
    /* on vérifie que la réponse de l'API est bien un succès (code 200-299), sinon on affiche une erreur avec le code HTTP */
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    /* on vérifie que la réponse est bien du JSON, sinon on affiche une erreur */
    if (!isJson) {
        throw new Error("La route /api/employee/orders ne renvoie pas du JSON.");
    }

    // Cas 1 : l'API renvoie directement un tableau
    if (Array.isArray(result)) {
        return result;
    }

    // Cas 2 : l'API renvoie { success: true, data: [...] }
    if (result?.success && Array.isArray(result.data)) {
        return result.data;
    }
    /* si la réponse ne correspond à aucun des formats attendus, on affiche une erreur pour éviter que l'application ne plante avec des données mal formées */
    throw new Error("Format de réponse invalide pour les commandes.");
}


/*-----------------------------
        Avis
-----------------------------*/

/* fonction de chargement des avis de l'API, avec gestion des erreurs et du message de statut de l'employé : on vérifie que la réponse de l'API est bien un succès, que c'est du JSON, et que le format de la réponse est correct (success: true + reviews: array), pour éviter les erreurs de parsing et d'affichage, et pour afficher des messages d'erreur clairs en cas de problème avec l'API */
async function loadEmployeeReviews() {
    /* on inclut les credentials (cookies) dans la requête pour que l'API puisse identifier l'employé connecté et retourner les avis correspondants, ce qui est important pour que l'employé puisse voir les avis qui lui sont destinés et gérer efficacement son travail */
    const res = await fetch('/api/employee/reviews', {
        /* on inclut les credentials (cookies) dans la requête pour que l'API puisse identifier l'employé connecté et retourner les avis correspondants, ce qui est important pour que l'employé puisse voir les avis qui lui sont destinés et gérer efficacement son travail */
        credentials: 'include'
    });

    /* on récupère le content-type de la réponse de l'API pour vérifier que c'est du JSON, et éviter les erreurs de parsing si ce n'est pas le cas */
    const contentType = res.headers.get('content-type') || '';
    /* on vérifie que le content-type de la réponse de l'API est bien du JSON, pour éviter les erreurs de parsing et afficher un message d'erreur clair si ce n'est pas le cas */
    const isJson = contentType.includes('application/json');

    /* on essaie de parser la réponse en JSON si le content-type le permet, pour éviter les erreurs de parsing et afficher un message d'erreur clair si ce n'est pas le cas, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée */
    const result = isJson
        /* on essaie de parser la réponse en JSON si le content-type le permet, pour éviter les erreurs de parsing et afficher un message d'erreur clair si ce n'est pas le cas, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée */
        ? await res.json().catch(() => null)
        /* si le content-type n'indique pas du JSON, on essaie quand même de récupérer la réponse en texte brut pour afficher un message d'erreur plus clair, et on gère les erreurs de récupération du texte pour éviter que l'application ne plante en cas de réponse mal formée */
        : await res.text().catch(() => null);

    /* on vérifie que la réponse de l'API est bien un succès (code 200-299), sinon on affiche une erreur avec le code HTTP */
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    /* on vérifie que la réponse de l'API est bien un succès (code 200-299), sinon on affiche une erreur avec le code HTTP */
    if (!isJson) {
        throw new Error("La route /api/employee/reviews ne renvoie pas du JSON.");
    }

    /* on vérifie que la réponse de l'API est bien un succès (code 200-299) et que le champ success de la réponse est true, sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (result?.success && Array.isArray(result.reviews)) {
        return result.reviews;
    }

    /* si la réponse ne correspond pas au format attendu, on affiche une erreur pour éviter les erreurs de parsing et d'affichage, et pour afficher un message d'erreur clair en cas de problème avec l'API */
    throw new Error("Format de réponse invalide pour les avis.");
}

/* ------------------------------
        Menus
------------------------------ */

async function loadEmployeeMenus() {
    const res = await fetch('/api/employee/menus', {
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
        throw new Error("La route /api/employee/menus ne renvoie pas du JSON.");
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


    throw new Error("Format de réponse invalide pour les menus.");
}


/* =================================================
        FILTRES ET RAFRAÎCHISSEMENT DES VUES
==================================================*/

/* ------------------------------
        Commandes
------------------------------ */

/* la fonction de filtrage des commandes prend en compte les critères de filtre sélectionnés (statut de la commande, email du client), et retourne la liste des commandes qui correspondent à ces critères, ce qui permet d'afficher uniquement les commandes qui intéressent l'employé en fonction de ses besoins du moment, et de gérer efficacement son travail */
function filterOrders(list) {
    /* on récupère les critères de filtre sélectionnés dans les champs de filtre (statut de la commande, email du client), en les nettoyant pour éviter les problèmes de formatage, et en gérant le cas où les champs sont vides pour ne pas appliquer de filtre sur ce critère, ce qui permet d'avoir une fonction de filtrage flexible qui s'adapte aux critères sélectionnés par l'employé pour trouver rapidement les commandes qui l'intéressent */
    const statusFilter = orderStatusFilterEl?.value?.trim() ?? "";
    /* le champ de filtre par email du client : on l'utilise pour filtrer les commandes affichées en fonction de l'email du client, ce qui permet à l'employé de trouver rapidement les commandes d'un client spécifique et de gérer efficacement son travail */
    const customerFilter = orderCustomerFilterEl?.value?.trim().toLowerCase() ?? "";

    /* on filtre la liste des commandes en fonction des critères de filtre sélectionnés : pour chaque commande, on vérifie si elle correspond aux critères de filtre (statut de la commande, email du client), et on retourne uniquement les commandes qui correspondent à ces critères, ce qui permet d'afficher uniquement les commandes qui intéressent l'employé en fonction de ses besoins du moment, et de gérer efficacement son travail */
    return list.filter(order => {
        /* on vérifie que la commande correspond au critère de filtre de statut : si aucun statut n'est sélectionné, on considère que toutes les commandes correspondent, sinon on compare le statut de la commande avec le statut sélectionné pour déterminer si elle correspond ou pas */
        const matchesStatus = !statusFilter || order.status === statusFilter;
        /* on vérifie que la commande correspond au critère de filtre d'email du client : si le champ de filtre est vide, on considère que toutes les commandes correspondent, sinon on compare l'email du client de la commande avec le champ de filtre (en ignorant la casse) pour déterminer si elle correspond ou pas, ce qui permet à l'employé de trouver rapidement les commandes d'un client spécifique et de gérer efficacement son travail */
        const matchesCustomer =
            /* on vérifie que le champ de filtre par email du client est vide, auquel cas toutes les commandes correspondent, ou que l'email du client de la commande (en ignorant la casse) inclut le champ de filtre (en ignorant la casse), auquel cas la commande correspond, ce qui permet à l'employé de trouver rapidement les commandes d'un client spécifique et de gérer efficacement son travail */
            !customerFilter ||
            String(order.customerEmail ?? "").toLowerCase().includes(customerFilter);

        return matchesStatus && matchesCustomer;
    });
}

/* la fonction de rafraîchissement de l'affichage des commandes applique les filtres sélectionnés à la liste des commandes chargées depuis l'API, puis met à jour l'affichage des cartes de commandes et du détail de la commande sélectionnée, et affiche un message de statut indiquant le nombre de commandes affichées ou un message d'erreur si aucune commande ne correspond aux filtres, ce qui permet à l'employé d'avoir une vue à jour des commandes qui correspondent à ses critères de recherche, et de gérer efficacement son travail */
function refreshOrdersView() {
    /* on applique les filtres sélectionnés à la liste des commandes chargées depuis l'API pour obtenir la liste des commandes à afficher, ce qui permet d'afficher uniquement les commandes qui intéressent l'employé en fonction de ses besoins du moment, et de gérer efficacement son travail */
    const filteredOrders = filterOrders(currentOrders);

    /* on met à jour l'affichage des cartes de commandes avec la liste des commandes filtrées, ce qui permet à l'employé d'avoir une vue à jour des commandes qui correspondent à ses critères de recherche, et de gérer efficacement son travail */
    renderOrdersCards(filteredOrders);

    /* si la commande sélectionnée dans le détail ne correspond plus aux filtres appliqués, on affiche le détail de la première commande de la liste filtrée (s'il y en a), ou un message d'erreur si aucune commande ne correspond aux filtres, ce qui permet à l'employé d'avoir une vue à jour du détail de la commande sélectionnée en fonction des critères de recherche appliqués, et de gérer efficacement son travail */
    if (filteredOrders.length) {
        renderOrderDetail(filteredOrders[0]);
        setEmployeeStatus(`${filteredOrders.length} commande(s) affichée(s)`);
        /* si aucune commande ne correspond aux filtres appliqués, on affiche un message d'erreur pour indiquer que aucune commande ne correspond aux critères de recherche sélectionnés, ce qui permet à l'employé de comprendre pourquoi aucune commande n'est affichée et de modifier ses critères de recherche en conséquence pour trouver les commandes qui l'intéressent et gérer efficacement son travail */
    } else {
        detailEl.innerHTML = `<div class="muted">Aucune commande ne correspond aux filtres.</div>`;
        setEmployeeStatus("Aucune commande trouvée", false);
    }
}


/*---------------------------------------------
        Avis Clients
--------------------------------------------- */

/* la fonction de rafraîchissement de l'affichage des avis met à jour l'affichage des cartes d'avis avec la liste des avis chargés depuis l'API, puis met à jour le détail de l'avis sélectionné (le premier de la liste par défaut), et affiche un message de statut indiquant le nombre d'avis affichés ou un message d'erreur si aucun avis n'est trouvé, ce qui permet à l'employé d'avoir une vue à jour des avis qui lui sont destinés et de gérer efficacement son travail en fonction des retours clients */
function refreshReviewsView() {
    /* on met à jour l'affichage des cartes d'avis avec la liste des avis chargés depuis l'API, ce qui permet à l'employé d'avoir une vue à jour des avis qui lui sont destinés et de gérer efficacement son travail en fonction des retours clients */
    renderReviewsCards(currentReviews);

    /* si des avis sont trouvés, on met à jour le détail de l'avis sélectionné (le premier de la liste par défaut) pour afficher les informations détaillées de cet avis, et on affiche un message de statut indiquant le nombre d'avis affichés, ce qui permet à l'employé d'avoir une vue à jour du détail de l'avis sélectionné et de gérer efficacement son travail en fonction des retours clients, et d'avoir un retour clair sur le nombre d'avis qu'il a à traiter pour gérer efficacement son travail en fonction de cette information */
    if (currentReviews.length) {
        /* on met à jour le détail de l'avis sélectionné (le premier de la liste par défaut) pour afficher les informations détaillées de cet avis, ce qui permet à l'employé d'avoir une vue à jour du détail de l'avis sélectionné et de gérer efficacement son travail en fonction des retours clients */
        renderReviewDetail(currentReviews[0]);
        /* on affiche un message de statut indiquant le nombre d'avis affichés, ce qui permet à l'employé d'avoir un retour clair sur le nombre d'avis qu'il a à traiter et de gérer efficacement son travail en fonction de cette information */
        setEmployeeStatus(`${currentReviews.length} avis affiché(s)`);
        /* si aucun avis n'est trouvé, on affiche un message d'erreur pour indiquer que aucun avis n'est en attente, ce qui permet à l'employé de comprendre qu'il n'a pas d'avis à traiter pour le moment et de se concentrer sur ses autres tâches pour gérer efficacement son travail */
    } else {
        detailEl.innerHTML = `<div class="muted">Aucun avis en attente.</div>`;
        setEmployeeStatus("Aucun avis trouvé");
    }
}


/*---------------------------------------------
        Menus
--------------------------------------------- */

function refreshMenusView() {
    renderMenusCards(currentMenus);

    if (currentMenus.length) {
        renderMenuDetail(currentMenus[0]);
        setEmployeeStatus(`${currentMenus.length} menu(s) affiché(s)`);
    } else {
        employeeMenuDetailEl.innerHTML = `<div class="muted">Aucun menu disponible.</div>`;
        setEmployeeStatus("Aucun menu trouvé");
    }
}


/* =============================================
        INTERACTIONS DE FILTRAGE
============================================= */

/* les boutons d'application et de réinitialisation des filtres de commande : on les utilise pour appliquer les filtres sélectionnés aux commandes affichées, ou pour réinitialiser les champs de filtre et afficher à nouveau toutes les commandes sans filtre, ce qui permet à l'employé de trouver rapidement les commandes qui l'intéressent en fonction de ses critères de recherche, et de gérer efficacement son travail */
applyOrderFiltersBtn?.addEventListener("click", () => {
    refreshOrdersView();
});
/* le bouton de réinitialisation des filtres de commande : on l'utilise pour réinitialiser les champs de filtre et afficher à nouveau toutes les commandes sans filtre, ce qui permet à l'employé de trouver rapidement les commandes qui l'intéressent en fonction de ses critères de recherche, et de gérer efficacement son travail */
resetOrderFiltersBtn?.addEventListener("click", () => {
    /* on réinitialise les champs de filtre de statut de la commande et d'email du client, puis on rafraîchit l'affichage des commandes pour afficher à nouveau toutes les commandes sans filtre, ce qui permet à l'employé de trouver rapidement les commandes qui l'intéressent en fonction de ses critères de recherche, et de gérer efficacement son travail */
    if (orderStatusFilterEl) orderStatusFilterEl.value = "";
    /* le champ de filtre par email du client : on l'utilise pour filtrer les commandes affichées en fonction de l'email du client, ce qui permet à l'employé de trouver rapidement les commandes d'un client spécifique et de gérer efficacement son travail */
    if (orderCustomerFilterEl) orderCustomerFilterEl.value = "";

    refreshOrdersView();
});


/* ====================================
        RENDU DU PANNEAU DE DÉTAIL
==================================== */

/*------------------------------
        Commandes
----------------------------- */

/* le détail d'une commande est plus complet que les autres, on affiche toutes les infos disponibles et les actions possibles (changer le statut, refuser la commande) */
function renderOrderDetail(order) {
    /* on vérifie si la commande est dans un statut qui bloque les actions (CANCELLED ou DONE), pour désactiver les boutons d'action correspondants dans le détail de la commande, ce qui permet d'éviter que l'employé puisse effectuer des actions sur une commande qui est déjà terminée ou annulée, et de gérer efficacement son travail en se concentrant sur les commandes qui nécessitent une action de sa part */
    const isLocked = order.status === "CANCELLED" || order.status === "DONE";

    /* le détail d'une commande est plus complet que les autres, on affiche toutes les infos disponibles et les actions possibles (changer le statut, refuser la commande) */
    detailEl.innerHTML = `
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
                <p><strong>Statut :</strong> <span class="order-status-badge order-status-${escapeHtml(String(order.status).toLowerCase())}">${escapeHtml(getStatusLabel(order.status ?? "—"))}</span></p>
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

/*-------------------------------------------
        Menus
------------------------------------------- */

/* le détail d'un menu est plus complet que les autres, on affiche toutes les infos disponibles et les actions possibles (modifier/supprimer) */
function renderMenuDetail(menu) {
    employeeMenuDetailEl.innerHTML = `
        <div class="employee-detail-card">
            <h3>${escapeHtml(menu.title ?? menu.name ?? "Menu sans nom")}</h3>

            <p><strong>Description :</strong> ${escapeHtml(menu.description ?? "Aucune description")}</p>
            <p><strong>Thème :</strong> ${escapeHtml(menu.theme ?? "Aucun thème")}</p>
            <p><strong>Régime :</strong> ${escapeHtml(menu.regime ?? "Aucun régime")}</p>
            <p><strong>Entrée :</strong> ${escapeHtml(menu.starter ?? "—")}</p>
            <p><strong>Plat principal :</strong> ${escapeHtml(menu.main ?? "—")}</p>
            <p><strong>Dessert :</strong> ${escapeHtml(menu.dessert ?? "—")}</p>
            <p><strong>Allergènes :</strong> ${escapeHtml((menu.allergens ?? []).join(", ") || "Aucun")}</p>
            <p><strong>Nombre de personnes minimum :</strong> ${escapeHtml(menu.minPersons ?? "—")}</p>
            <p><strong>Prix de base :</strong> ${escapeHtml(menu.basePrice ?? menu.price ?? "—")} €</p>
            <p><strong>Stock disponible :</strong> ${escapeHtml(menu.stock ?? "—")}</p>
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


/* ----------------------------------------
        FORMULAIRE DE CRÉATION DE MENU
---------------------------------------- */

/* le formulaire de création d'un menu permet à l'employé de saisir les informations nécessaires pour créer un nouveau menu (titre, description, thème, régime, prix de base, stock), et de soumettre ces informations à l'API pour créer le menu, ce qui permet à l'employé d'ajouter facilement de nouveaux menus à l'offre de l'entreprise et de gérer efficacement son travail en fonction des besoins des clients */
function renderMenuCreateForm() {
    employeeMenuDetailEl.innerHTML = `
        <div class="employee-detail-card">
            <h3>Ajouter un menu</h3>

            <div class="field">
                <label for="newMenuTitle">Titre</label>
                <input id="newMenuTitle" type="text" placeholder="Nom du menu">
            </div>

            <div class="field">
                <label for="newMenuDescription">Description</label>
                <textarea id="newMenuDescription" rows="4" placeholder="Description du menu"></textarea>
            </div>

            <div class="field">
                <label for="newMenuTheme">Thème</label>
                <input id="newMenuTheme" type="text" placeholder="Ex: Mariage">
            </div>

            <div class="field">
                <label for="newMenuRegime">Régime</label>
                <select id="newMenuRegime">
                    <option value="NONE">Aucun</option>
                    <option value="VEGETARIAN">Végétarien</option>
                    <option value="HALAL">Halal</option>
                    <option value="GLUTEN_FREE">Sans gluten</option>
                </select>
            </div>

            <div class="field">
                <label for="newMenuAllergens">Allergènes (séparés par des virgules)</label>
                <input id="newMenuAllergens" type="text" placeholder="Ex: Arachides, Fruits de mer">
            </div>

            <div class="field">
                <label for="newMenuStarter">Entrée</label>
                <input id="newMenuStarter" type="text" placeholder="Ex: Salade César">
            </div>

            <div class="field">
                <label for="newMenuMain">Plat principal</label>
                <input id="newMenuMain" type="text" placeholder="Ex: Filet de boeuf">
            </div>

            <div class="field">
                <label for="newMenuDessert">Dessert</label>
                <input id="newMenuDessert" type="text" placeholder="Ex: Tarte au chocolat">
            </div>

            <div class="field">
                <label for="newMenuMinPersons">Nombre de personnes minimum</label>
                <input id="newMenuMinPersons" type="number" min="1" placeholder="1">
            </div>

            <div class="field">
                <label for="newMenuStock">Stock</label>
                <input id="newMenuStock" type="number" min="0" placeholder="0">
            </div>

            <div class="field">
                <label for="newMenuBasePrice">Prix de base (€)</label>
                <input id="newMenuBasePrice" type="number" min="0" step="0.01" placeholder="0.00">
            </div>

            <div class="employee-detail-actions" style="margin-top:16px;">
                <button class="btn secondary" type="button" id="saveNewMenuBtn">
                    Créer le menu
                </button>
            </div>
        </div>
    `;

    /* le bouton de sauvegarde du nouveau menu : on l'utilise pour récupérer les informations saisies dans le formulaire, les valider, et les envoyer à l'API pour créer le menu, ce qui permet à l'employé d'ajouter facilement de nouveaux menus à l'offre de l'entreprise et de gérer efficacement son travail en fonction des besoins des clients */
    const saveBtn = document.getElementById("saveNewMenuBtn");

    /* on ajoute un écouteur d'événement au bouton de sauvegarde du nouveau menu pour gérer la création du menu quand l'employé clique dessus, ce qui permet à l'employé d'ajouter facilement de nouveaux menus à l'offre de l'entreprise et de gérer efficacement son travail en fonction des besoins des clients */
    saveBtn?.addEventListener("click", async () => {
        /* on récupère le titre saisi dans le formulaire et on le nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de titre, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const title = document.getElementById("newMenuTitle")?.value.trim() ?? "";
        /* on récupère la description saisie dans le formulaire et on la nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de description, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const description = document.getElementById("newMenuDescription")?.value.trim() ?? "";
        /* on récupère le thème saisi dans le formulaire et on le nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de thème, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const theme = document.getElementById("newMenuTheme")?.value.trim() ?? "";
        /* on récupère le régime saisi dans le formulaire et on le nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de régime, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const regime = document.getElementById("newMenuRegime")?.value.trim() ?? "";
        /* on récupère l'entrée saisie dans le formulaire et on la nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer d'entrée, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const starter = document.getElementById("newMenuStarter")?.value.trim() ?? "";
        /* on récupère le plat principal saisi dans le formulaire et on le nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de plat principal, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const main = document.getElementById("newMenuMain")?.value.trim() ?? "";
        /* on récupère le dessert saisi dans le formulaire et on le nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer de dessert, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const dessert = document.getElementById("newMenuDessert")?.value.trim() ?? "";
        /* on récupère les allergènes saisis dans le formulaire et on les nettoie pour éviter les problèmes de formatage, en gérant le cas où le champ est vide pour ne pas envoyer d'allergènes, ce qui permet d'avoir une fonction de création de menu flexible qui s'adapte aux informations saisies par l'employé pour créer un menu qui correspond aux besoins des clients et gérer efficacement son travail en fonction de cette information */
        const allergensRaw = document.getElementById("newMenuAllergens")?.value.trim() ?? "";
        const allergens = allergensRaw
            .split(",")
            .map(a => a.trim())
            .filter(a => a !== "");
        /* on récupère le nombre de personnes minimum saisi dans le formulaire et on le convertit en nombre, en gérant le cas où le champ est vide ou contient une valeur non numérique pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        const rawMinPersons = document.getElementById("newMenuMinPersons")?.value;
        const minPersons = rawMinPersons ? Number(rawMinPersons) : 1;
        /* on récupère le prix de base saisi dans le formulaire et on le convertit en nombre, en gérant le cas où le champ est vide ou contient une valeur non numérique pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        const basePrice = Number(document.getElementById("newMenuBasePrice")?.value ?? 0);
        /* on récupère le stock saisi dans le formulaire et on le convertit en nombre, en gérant le cas où le champ est vide ou contient une valeur non numérique pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        const stock = Number(document.getElementById("newMenuStock")?.value ?? 0);

        /* on vérifie que le titre du menu est bien renseigné, pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        if (!title) {
            setEmployeeStatus("Le titre est obligatoire.", false);
            return;
        }

        /* on vérifie que le prix de base est un nombre valide (positif ou nul), pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        if (Number.isNaN(basePrice)) {
            setEmployeeStatus("Le prix doit être un nombre valide.", false);
            return;
        }

        /* on vérifie que le stock est un nombre valide (entier positif), pour éviter les erreurs de validation côté serveur et afficher un message d'erreur clair à l'employé en cas de problème avec les données saisies, ce qui permet à l'employé de corriger rapidement les données saisies et de gérer efficacement son travail en fonction de cette information */
        if (Number.isNaN(stock)) {
            setEmployeeStatus("Le stock doit être un nombre valide.", false);
            return;
        }

        /* on essaie d'envoyer les données du nouveau menu à l'API pour créer le menu, et on gère les erreurs de communication avec l'API pour afficher un message d'erreur clair en cas de problème, ce qui permet à l'employé d'avoir un retour clair sur le résultat de son action et de gérer efficacement son travail en fonction de cette information, et si la création du menu est réussie, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
        try {
            console.log("DATA ENVOYÉE :", {
                title,
                minPersons,
                basePrice,
                stock
            });

            const res = await fetch('/api/employee/menus', {
                /* on utilise la méthode POST pour envoyer les données du nouveau menu à l'API, ce qui permet de créer un nouveau menu dans la base de données de l'entreprise en fonction des informations saisies par l'employé, et de gérer efficacement son travail en fonction de cette action */
                method: 'POST',
                /* on inclut les credentials (cookies) dans la requête pour que l'API puisse identifier l'employé connecté et associer le menu créé à cet employé, ce qui permet à l'employé d'ajouter facilement de nouveaux menus à l'offre de l'entreprise et de gérer efficacement son travail en fonction des besoins des clients */
                credentials: 'include',
                /* on précise que le corps de la requête est au format JSON, et que l'on attend une réponse au format JSON de l'API, ce qui permet d'assurer une communication claire et structurée avec l'API pour la création du menu, et de gérer efficacement les données échangées entre le client et le serveur en fonction de cette information */
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                /* on envoie les données du nouveau menu au format JSON dans le corps de la requête, avec les champs nécessaires pour créer un menu (titre, description, thème, régime, prix de base, stock), et on inclut les credentials (cookies) pour que l'API puisse identifier l'employé connecté et associer le menu créé à cet employé, ce qui permet à l'employé d'ajouter facilement de nouveaux menus à l'offre de l'entreprise et de gérer efficacement son travail en fonction des besoins des clients */
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

            /* on essaie de parser la réponse de l'API en JSON pour récupérer les données du menu créé, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée, ce qui permet d'avoir un retour clair sur le résultat de l'action de création du menu et de gérer efficacement son travail en fonction de cette information, et si la réponse de l'API inclut les données du menu créé, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
            const result = await parseJsonResponse(res);

            /* on vérifie que la création du menu a réussi en vérifiant que la réponse de l'API est un succès (code 200-299) et que le champ success de la réponse est true, sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en corrigeant les données saisies ou en contactant le support) */
            if (!res.ok || !result?.success) {
                /* si la création du menu échoue (par exemple à cause de données invalides ou d'un problème avec l'API), on affiche un message d'erreur clair pour que l'employé puisse comprendre ce qui s'est mal passé et réagir en conséquence (par exemple en corrigeant les données saisies ou en contactant le support), ce qui permet à l'employé de gérer efficacement son travail même en cas de problème avec l'API ou les données saisies */
                throw new Error(result?.error || `HTTP ${res.status}`);
            }

            /* si la création du menu est réussie, on affiche un message de succès pour informer l'employé que le menu a été créé avec succès, ce qui permet à l'employé d'avoir un retour clair sur le résultat de son action et de gérer efficacement son travail en fonction de cette information */
            setEmployeeStatus("Menu créé avec succès.");

            currentMenus = await loadEmployeeMenus();
            refreshMenusView();

            /* si la réponse de l'API inclut les données du menu créé, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
            const createdMenu = result.item;
            /* après la création du menu, on recharge la liste des menus depuis l'API pour s'assurer d'avoir les données à jour, et on rafraîchit l'affichage des menus pour inclure le nouveau menu créé, ce qui permet à l'employé de voir immédiatement le résultat de son action et de gérer efficacement son travail en fonction de cette information, et si la réponse de l'API inclut les données du menu créé, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
            if (createdMenu) {
                /* si la réponse de l'API inclut les données du menu créé, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
                renderMenuDetail(createdMenu);
            }
            /* après la création du menu, on recharge la liste des menus depuis l'API pour s'assurer d'avoir les données à jour, et on rafraîchit l'affichage des menus pour inclure le nouveau menu créé, ce qui permet à l'employé de voir immédiatement le résultat de son action et de gérer efficacement son travail en fonction de cette information, et si la réponse de l'API inclut les données du menu créé, on affiche directement le détail de ce menu pour que l'employé puisse voir les informations détaillées du menu qu'il vient de créer et gérer efficacement son travail en fonction de cette information */
        } catch (err) {
            /* en cas d'erreur lors de la création du menu (problème avec l'API, données saisies invalides, etc.), on affiche un message d'erreur clair pour que l'employé puisse comprendre ce qui s'est mal passé et réagir en conséquence (par exemple en corrigeant les données saisies ou en contactant le support), ce qui permet à l'employé de gérer efficacement son travail même en cas de problème avec l'API ou les données saisies */
            setEmployeeStatus(`Erreur création menu : ${err.message}`, false);
        }
    });
}

/*------------------------------
        Avis Clients
-----------------------------*/

/* le détail d'un avis est plus simple que les autres, on affiche juste les infos de base et les actions possibles (valider/refuser) */
function renderReviewDetail(review) {
    detailEl.innerHTML = `
        <div class="employee-detail-grid">
            <div class="employee-detail-box">
                <h3>Avis #${escapeHtml(review.id)}</h3>
                <p><strong>Auteur :</strong> ${escapeHtml(review.authorEmail ?? "Inconnu")}</p>
                <p><strong>Date :</strong> ${escapeHtml(review.createdAt ?? "—")}</p>
            </div>

            <div class="employee-detail-box">
                <h3>Note</h3>
                <p><strong>${escapeHtml(review.rating)} / 5</strong></p>
                <p><strong>Statut :</strong> ${escapeHtml(review.status ?? "—")}</p>
            </div>

            <div class="employee-detail-box">
                <h3>Commentaire</h3>
                <p>${escapeHtml(review.comment ?? "")}</p>
                <div class="employee-actions">
                    <button class="btn secondary" type="button" data-review-action="approve" data-id="${escapeHtml(review.id)}">Valider</button>
                    <button class="btn secondary" type="button" data-review-action="reject" data-id="${escapeHtml(review.id)}">Refuser</button>
                </div>
            </div>
        </div>
    `;
}


/* ================================================
        RENDU DES CARTES 
================================================ */

/* ---------------------------------------
        Commandes
--------------------------------------- */
/* rend une liste de commandes sous forme de cartes, avec les infos de base (id, client, menu, nombre de personnes, statut) */
function renderOrdersCards(list) {
    if (!list.length) {
        ordersGrid.innerHTML = `<div class="muted">Aucune commande.</div>`;
        return;
    }

    ordersGrid.innerHTML = list.map(order => `
        <article class="employee-mini-card dashboard-item-card order-card" data-type="order" data-id="${escapeHtml(order.id)}">
            <h3>Commande #${escapeHtml(order.id)}</h3>

            <p><strong>Client :</strong> ${escapeHtml(order.customerEmail ?? "Client inconnu")}</p>
            <p><strong>Menu :</strong> ${escapeHtml(order.menu?.title ?? "Menu inconnu")}</p>
            <p><strong>Personnes :</strong> ${escapeHtml(order.persons ?? "—")} pers.</p>
            <p><strong>Statut :</strong> ${escapeHtml(order.status ?? "—")}</p>

            <div class="card-actions">
                <button class="btn" type="button" data-type="order" data-id="${escapeHtml(order.id)}">
                    Voir / traiter
                </button>
            </div>
        </article>
    `).join("");
}

/* -----------------------------------------
        Menus
----------------------------------------- */

/* rend une liste de menus sous forme de cartes, avec les infos de base (titre, thème, régime, stock) */
function renderMenusCards(list) {
    if (!list.length) {
        menusGrid.innerHTML = `<div class="muted">Aucun menu.</div>`;
        return;
    }

    menusGrid.innerHTML = list.map(menu => `
        <article class="employee-mini-card dashboard-item-card employee-menu-card" data-type="menu" data-id="${escapeHtml(menu.id)}">
            <h3>${escapeHtml(menu.title ?? "Menu sans nom")}</h3>

            <p><strong>Thème :</strong> ${escapeHtml(menu.theme ?? "—")}</p>
            <p><strong>Régime :</strong> ${escapeHtml(menu.regime ?? "—")}</p>
            <p><strong>Stock :</strong> ${escapeHtml(menu.stock ?? "—")}</p>
            <p><strong>Statut :</strong> ${escapeHtml(menu.isActive ? "Actif" : "Inactif")}</p>

            <div class="card-actions">
                <button class="btn" type="button" data-type="menu" data-id="${escapeHtml(menu.id)}">
                    Voir
                </button>
            </div>
        </article>
    `).join("");
}

/* -------------------------------------------------
        Avis Clients
-------------------------------------------------- */

/* rend une liste d'avis sous forme de cartes, avec les infos de base (client, note, référence de commande) */
function renderReviewsCards(list) {
    if (!list.length) {
        reviewsGrid.innerHTML = `<div class="muted">Aucun avis.</div>`;
        return;
    }

    reviewsGrid.innerHTML = list.map(review => `
        <article class="employee-mini-card" data-type="review" data-id="${escapeHtml(review.id)}">
            <h3>${escapeHtml(review.authorEmail ?? "Auteur inconnu")}</h3>
            <p>Note : ${escapeHtml(review.rating)} / 5</p>
            <p>${escapeHtml(review.status ?? "—")}</p>
        </article>
    `).join("");
}

/* fonction de gestion de l'action de modification d'un menu : on affiche des prompts pour modifier les différentes propriétés du menu, puis on envoie une requête PATCH à l'API pour mettre à jour le menu, et on rafraîchit la liste des menus et le détail du menu modifié pour afficher les changements, avec gestion des erreurs pour afficher un message clair en cas de problème avec l'API ou les données saisies, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients */
async function handleEditMenu(menuId) {
    /* on trouve le menu correspondant à l'id dans la liste des menus chargés depuis l'API, pour pré-remplir les prompts de modification avec les valeurs actuelles du menu, ce qui facilite la modification pour l'employé en lui évitant de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const selectedMenu = currentMenus.find(menu => String(menu.id) === String(menuId));

    /* si aucun menu correspondant n'est trouvé, on affiche un message d'erreur pour indiquer que le menu est introuvable, ce qui permet à l'employé de comprendre qu'il y a un problème avec l'identifiant du menu sélectionné et de réessayer avec un menu valide pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients */
    if (!selectedMenu) {
        setEmployeeStatus("Menu introuvable.", false);
        return;
    }

    /* on affiche des prompts pour modifier les différentes propriétés du menu, en pré-remplissant les prompts avec les valeurs actuelles du menu pour faciliter la modification, et en gérant le cas où l'employé annule un prompt pour ne pas appliquer de changement sur ce champ, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newTitle = window.prompt("Nom du menu :", selectedMenu.title ?? selectedMenu.name ?? "");
    /* si l'employé annule le prompt de modification du titre, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le titre du menu, ce qui permet à l'employé de ne pas être obligé de modifier le titre du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newTitle === null) return;

    /* on affiche des prompts pour modifier les différentes propriétés du menu, en pré-remplissant les prompts avec les valeurs actuelles du menu pour faciliter la modification, et en gérant le cas où l'employé annule un prompt pour ne pas appliquer de changement sur ce champ, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newDescription = window.prompt("Description :", selectedMenu.description ?? "");
    /* si l'employé annule le prompt de modification de la description, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur la description du menu, ce qui permet à l'employé de ne pas être obligé de modifier la description du menu s'il ne souhaite pas la changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newDescription === null) return;

    /* si l'employé annule le prompt de modification du thème, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le thème du menu, ce qui permet à l'employé de ne pas être obligé de modifier le thème du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newTheme = window.prompt("Thème :", selectedMenu.theme ?? "");
    /* si l'employé annule le prompt de modification du thème, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le thème du menu, ce qui permet à l'employé de ne pas être obligé de modifier le thème du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newTheme === null) return;

    /* si l'employé annule le prompt de modification du régime, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le régime du menu, ce qui permet à l'employé de ne pas être obligé de modifier le régime du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newRegime = window.prompt("Régime :", selectedMenu.regime ?? "");
    /* si l'employé annule le prompt de modification du régime, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le régime du menu, ce qui permet à l'employé de ne pas être obligé de modifier le régime du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newRegime === null) return;

    /* on affiche des prompts pour modifier les différentes propriétés du menu, en pré-remplissant les prompts avec les valeurs actuelles du menu pour faciliter la modification, et en gérant le cas où l'employé annule un prompt pour ne pas appliquer de changement sur ce champ, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newBasePriceRaw = window.prompt("Prix de base :", selectedMenu.basePrice ?? selectedMenu.price ?? 0);
    /* si l'employé annule le prompt de modification du prix de base, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le prix de base du menu, ce qui permet à l'employé de ne pas être obligé de modifier le prix de base du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newBasePriceRaw === null) return;

    /* on affiche des prompts pour modifier les différentes propriétés du menu, en pré-remplissant les prompts avec les valeurs actuelles du menu pour faciliter la modification, et en gérant le cas où l'employé annule un prompt pour ne pas appliquer de changement sur ce champ, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    const newStockRaw = window.prompt("Stock :", selectedMenu.stock ?? 0);
    /* si l'employé annule le prompt de modification du stock, on considère que la modification est annulée pour ce champ et on n'applique pas de changement sur le stock du menu, ce qui permet à l'employé de ne pas être obligé de modifier le stock du menu s'il ne souhaite pas le changer, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de ressaisir toutes les informations du menu s'il ne souhaite modifier que quelques propriétés */
    if (newStockRaw === null) return;

    /* on convertit les valeurs saisies pour le prix de base et le stock en nombres, et on vérifie que ce sont des nombres valides pour éviter les problèmes de formatage et d'envoi de données invalides à l'API, ce qui permet à l'employé de saisir des valeurs correctes pour ces champs et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients sans être bloqué par des erreurs de formatage */
    const newBasePrice = Number(newBasePriceRaw);
    /* on convertit les valeurs saisies pour le prix de base et le stock en nombres, et on vérifie que ce sont des nombres valides pour éviter les problèmes de formatage et d'envoi de données invalides à l'API, ce qui permet à l'employé de saisir des valeurs correctes pour ces champs et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients sans être bloqué par des erreurs de formatage */
    const newStock = Number(newStockRaw);

    /* si le prix de base saisi n'est pas un nombre valide, on affiche un message d'erreur pour indiquer que le prix doit être un nombre valide, ce qui permet à l'employé de comprendre qu'il y a un problème avec la valeur saisie pour le prix de base et de corriger cette valeur pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients sans être bloqué par des erreurs de formatage */
    if (Number.isNaN(newBasePrice)) {
        setEmployeeStatus("Le prix doit être un nombre valide.", false);
        return;
    }

    /* si le stock saisi n'est pas un nombre valide, on affiche un message d'erreur pour indiquer que le stock doit être un nombre valide, ce qui permet à l'employé de comprendre qu'il y a un problème avec la valeur saisie pour le stock et de corriger cette valeur pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients sans être bloqué par des erreurs de formatage */
    if (Number.isNaN(newStock)) {
        setEmployeeStatus("Le stock doit être un nombre valide.", false);
        return;
    }

    /* on envoie une requête PATCH à l'API pour mettre à jour le menu avec les nouvelles valeurs saisies, et on gère la réponse de l'API pour afficher un message de succès ou d'erreur en fonction du résultat de la requête, ce qui permet à l'employé de modifier facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa modification */
    try {
        const res = await fetch(`/api/employee/menus/${encodeURIComponent(menuId)}`, {
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

        /* on parse la réponse de l'API pour obtenir le résultat de la modification, et on vérifie si la requête a réussi ou si une erreur est survenue pour afficher un message de succès ou d'erreur en conséquence, ce qui permet à l'employé de comprendre le résultat de sa modification et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa modification */
        const result = await parseJsonResponse(res);

        /* si la requête n'a pas réussi ou si le résultat indique une erreur, on affiche un message d'erreur pour indiquer le problème rencontré, ce qui permet à l'employé de comprendre qu'il y a eu un problème avec la modification du menu et de réessayer en corrigeant les éventuelles erreurs pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa modification */
        if (!res.ok || !result?.success) {
            throw new Error(result?.error || `HTTP ${res.status}`);
        }

        /* si la modification a réussi, on affiche un message de succès pour indiquer que le menu a été modifié avec succès, ce qui permet à l'employé de comprendre que sa modification a été prise en compte et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa modification */
        setEmployeeStatus(`Menu #${menuId} modifié avec succès.`);

        /* on rafraîchit la liste des menus et le détail du menu modifié pour afficher les changements, ce qui permet à l'employé de voir immédiatement les résultats de sa modification et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa modification */
        currentMenus = await loadEmployeeMenus();
        refreshMenusView();

        /* on rafraîchit la liste des menus et le détail du menu modifié pour afficher les changements, ce qui permet à l'employé de voir immédiatement les résultats de sa modification et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa modification */
        const updatedMenu = currentMenus.find(menu => String(menu.id) === String(menuId));
        if (updatedMenu) {
            renderMenuDetail(updatedMenu);
        }

        /* si une erreur est survenue lors de la modification du menu, on affiche un message d'erreur pour indiquer le problème rencontré, ce qui permet à l'employé de comprendre qu'il y a eu un problème avec la modification du menu et de réessayer en corrigeant les éventuelles erreurs pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa modification */
    } catch (err) {
        setEmployeeStatus(`Erreur modification menu : ${err.message}`, false);
    }
}

/* fonction de gestion de l'action de suppression d'un menu : on affiche une confirmation avant de supprimer le menu, puis on envoie une requête DELETE à l'API pour supprimer le menu, et on rafraîchit la liste des menus pour afficher les changements, avec gestion des erreurs pour afficher un message clair en cas de problème avec l'API, ce qui permet à l'employé de supprimer facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa suppression */
async function handleDeleteMenu(menuId) {
    /* on affiche une confirmation avant de supprimer le menu pour éviter les suppressions accidentelles, ce qui permet à l'employé de confirmer son intention de supprimer le menu et de gérer efficacement son travail en évitant les erreurs qui pourraient survenir en cas de suppression accidentelle, tout en ayant un retour clair sur le résultat de sa suppression */
    const confirmed = window.confirm("Voulez-vous vraiment supprimer ce menu ?");
    /* si l'employé annule la confirmation de suppression, on considère que la suppression est annulée et on n'applique pas de changement, ce qui permet à l'employé de ne pas être obligé de supprimer le menu s'il change d'avis, et de gérer efficacement son travail en se concentrant sur les changements qu'il souhaite apporter au menu sans être obligé de confirmer une suppression s'il ne souhaite pas supprimer le menu, tout en ayant un retour clair sur le résultat de sa suppression */
    if (!confirmed) return;

    /* on envoie une requête DELETE à l'API pour supprimer le menu avec l'id spécifié, et on gère la réponse de l'API pour afficher un message de succès ou d'erreur en fonction du résultat de la requête, ce qui permet à l'employé de supprimer facilement les menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa suppression */
    try {
        const res = await fetch(`/api/employee/menus/${encodeURIComponent(menuId)}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        /* on parse la réponse de l'API pour obtenir le résultat de la suppression, et on vérifie si la requête a réussi ou si une erreur est survenue pour afficher un message de succès ou d'erreur en conséquence, ce qui permet à l'employé de comprendre le résultat de sa suppression et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa suppression */
        let result = null;
        try {
            result = await parseJsonResponse(res);
            /* si la réponse de l'API n'est pas un JSON valide, on considère que le résultat est null, ce qui permet à l'employé de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa suppression même en cas de problème avec la réponse de l'API */
        } catch {
            result = null;
        }

        /* si la requête n'a pas réussi, on affiche un message d'erreur pour indiquer le problème rencontré, ce qui permet à l'employé de comprendre qu'il y a eu un problème avec la suppression du menu et de réessayer en corrigeant les éventuelles erreurs pour gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa suppression */
        if (!res.ok) {
            throw new Error(result?.error || `HTTP ${res.status}`);
        }

        /* si la suppression a réussi, on affiche un message de succès pour indiquer que le menu a été supprimé avec succès, ce qui permet à l'employé de comprendre que sa suppression a été prise en compte et de gérer efficacement son travail en modifiant les menus proposés en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de sa suppression */
        setEmployeeStatus(`Menu #${menuId} supprimé avec succès.`);

        /* on rafraîchit la liste des menus pour afficher les changements, ce qui permet à l'employé de voir immédiatement les résultats de sa suppression et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de sa suppression */
        currentMenus = await loadEmployeeMenus();
        refreshMenusView();


    } catch (err) {
        setEmployeeStatus(`Erreur suppression menu : ${err.message}`, false);
    }


}

/* fonction de gestion de l'action de basculement de l'état actif d'un menu : on envoie une requête PATCH à l'API pour mettre à jour l'état actif du menu, et on rafraîchit la liste des menus pour afficher les changements, avec gestion des erreurs pour afficher un message clair en cas de problème avec l'API, ce qui permet à l'employé de basculer facilement l'état actif des menus proposés en fonction des besoins et des retours clients, et de gérer efficacement son travail en maintenant à jour les informations des menus affichés aux clients, tout en ayant un retour clair sur le résultat de son action */
async function handleToggleMenuActive(menuId) {

    const menu = currentMenus.find(m => String(m.id) === String(menuId));
    if (!menu) return;

    const newState = !menu.isActive;

    try {
        const res = await fetch(`/api/employee/menus/${encodeURIComponent(menuId)}/active`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ isActive: newState })
        });

        const result = await parseJsonResponse(res);

        if (!res.ok || !result?.success) {
            throw new Error(result?.error || "Erreur mise à jour menu");
        }

        setEmployeeStatus("Statut du menu mis à jour");

        currentMenus = await loadEmployeeMenus();
        refreshMenusView();

    } catch (err) {
        setEmployeeStatus(err.message, false);
    }
}


/* =============================================
        GESTION DES ACTIONS UTILISATEUR
============================================= */

/* -------------------------------
        Actions Commandes
------------------------------- */

/* les actions liées à une commande (changer le statut, refuser la commande) sont gérées ici, en fonction du data-order-action du bouton cliqué */
detailEl.addEventListener("click", async (e) => {
    /* on vérifie que le clic a eu lieu sur un bouton d'action lié à une commande, en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec l'attribut data-order-action */
    const btn = e.target.closest("[data-order-action]");
    if (!btn) return;

    /* si on a trouvé un bouton d'action lié à une commande, on récupère l'action correspondante et l'id de la commande, puis on effectue l'action correspondante (changer le statut, refuser la commande) */
    const action = btn.dataset.orderAction;
    const id = btn.dataset.id;

    /* si on a trouvé un bouton d'action lié à une commande, on récupère l'id de la commande correspondante, puis on vérifie que la commande correspondante n'est pas dans un statut qui bloque les actions (CANCELED ou DONE), pour éviter que l'employé puisse effectuer des actions sur une commande qui est déjà terminée ou annulée, et de gérer efficacement son travail en se concentrant sur les commandes qui nécessitent une action de sa part */
    const selectedOrder = currentOrders.find(order => String(order.id) === String(id));

    /* si la commande correspondante est dans un statut qui bloque les actions (CANCELED ou DONE), on affiche un message d'erreur pour indiquer que l'action est impossible, ce qui permet à l'employé de comprendre pourquoi il ne peut pas effectuer d'actions sur cette commande et de gérer efficacement son travail en se concentrant sur les commandes qui nécessitent une action de sa part */
    if (selectedOrder && (selectedOrder.status === "DONE" || selectedOrder.status === "CANCELLED")) {
        setEmployeeStatus(`Action impossible : commande ${selectedOrder.status}.`, false);
        return;
    }

    /* en fonction de l'action correspondante, on effectue l'action correspondante (changer le statut, refuser la commande) : pour l'instant on affiche juste un message de statut, mais on branchera ensuite les appels à l'API pour effectuer les actions réelles */
    if (action === "toggle-cancel") {
        const box = document.getElementById("cancelOrderBox");
        /* si on a cliqué sur le bouton “Refuser” pour une commande, on affiche ou cache le formulaire de refus de commande (mode de contact + motif), pour éviter d'encombrer l'interface avec ce formulaire qui n'est pas toujours nécessaire */
        if (!box) return;

        box.style.display = box.style.display === "none" ? "block" : "none";
        return;
    }

    /* si on a cliqué sur le bouton “Confirmer le refus” pour une commande, on récupère les informations du formulaire de refus (mode de contact + motif), on vérifie que les champs sont bien remplis, puis on effectue l'action de refus de la commande en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API */
    if (action === "confirm-cancel") {
        const contactMode = document.getElementById("cancelContactMode")?.value ?? "";
        const reason = document.getElementById("cancelReason")?.value.trim() ?? "";
        const msgEl = document.getElementById("cancelOrderMsg");

        /* si le mode de contact ou le motif ne sont pas remplis, on affiche un message d'erreur pour indiquer que ces champs sont obligatoires, et on arrête l'exécution de la fonction pour éviter d'appeler l'API avec des données invalides */
        if (!contactMode || !reason) {
            if (msgEl) {
                msgEl.textContent = "Le mode de contact et le motif sont obligatoires.";
                msgEl.className = "msg error";
            }
            return;
        }

        /* si le mode de contact et le motif sont bien remplis, on effectue l'action de refus de la commande en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API : pour l'instant on simule cet appel avec un timeout, mais on branchera ensuite l'appel à l'API réelle pour que ce soit fonctionnel */
        try {
            // route backend à créer / brancher
            const res = await fetch(`/api/employee/orders/${encodeURIComponent(id)}/cancel`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                /* on envoie le mode de contact et le motif dans le corps de la requête pour que le backend puisse les utiliser pour contacter le client et enregistrer le motif d'annulation, ce qui est important pour la gestion des commandes et la relation client */
                body: JSON.stringify({
                    contactMode,
                    reason
                })
            });

            /* on récupère le content-type de la réponse de l'API pour vérifier que c'est du JSON, et éviter les erreurs de parsing si ce n'est pas le cas */
            const result = await res.json();

            /* on vérifie que la réponse de l'API est bien un succès (code 200-299) et que le champ success de la réponse est true, sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
            if (!res.ok || !result.success) {
                throw new Error(result.error || "Impossible de refuser la commande");
            }

            /* si l'appel à l'API de refus de la commande est un succès, on affiche un message de succès pour indiquer que la commande a bien été refusée, et on met à jour le statut de la commande dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail */
            if (msgEl) {
                msgEl.textContent = "Commande refusée.";
                msgEl.className = "msg ok";
            }

            /* mise à jour du statut de la commande dans l'interface : pour l'instant on affiche juste un message de statut, mais on branchera ensuite la mise à jour réelle du statut de la commande dans l'interface pour que ce soit fonctionnel */
            setEmployeeStatus("Commande refusée");
            /* on met à jour la liste des commandes affichée dans l'interface pour refléter le changement de statut de la commande, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail */
            const refreshedOrders = await loadEmployeeOrders();
            currentOrders = refreshedOrders;

            refreshOrdersView();

            /* si le détail de la commande affiché correspond à la commande qui vient d'être refusée, on met à jour le détail affiché pour refléter le changement de statut, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail */
            const updatedOrder = currentOrders.find(order => String(order.id) === String(id));
            if (updatedOrder) {
                renderOrderDetail(updatedOrder);
            }

            /* on affiche un message de succès pour indiquer que la commande a bien été refusée, et on met à jour le statut de la commande dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail */
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || "Erreur lors du refus de la commande.";
                msgEl.className = "msg error";
            }

            setEmployeeStatus(`Erreur refus: ${err.message}`, false);
        }

        return;
    }

    // pour les autres actions (changer le statut de la commande), on effectue l'action correspondante en appelant l'API correspondante, puis on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, et on met à jour le statut de la commande dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail
    if (action === "accept" || action === "preparing" || action === "delivering" || action === "done") {
        let status = null;

        // en fonction de l'action correspondante, on détermine le nouveau statut de la commande à envoyer à l'API pour mettre à jour le statut de la commande, ce qui est important pour que le backend puisse gérer correctement les commandes et leur suivi, et pour que l'employé puisse voir le statut à jour de ses commandes dans l'interface pour gérer efficacement son travail
        if (action === "accept") status = "ACCEPTED";
        if (action === "preparing") status = "PREPARING";
        if (action === "delivering") status = "DELIVERING";
        if (action === "done") status = "DONE";

        try {
            const res = await fetch(`/api/employee/orders/${encodeURIComponent(id)}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            });

            // on récupère le content-type de la réponse de l'API pour vérifier que c'est du JSON, et éviter les erreurs de parsing si ce n'est pas le cas
            const result = await res.json();

            // on vérifie que la réponse de l'API est bien un succès (code 200-299) et que le champ success de la réponse est true, sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support)
            if (!res.ok || !result.success) {
                throw new Error(result.error || "Impossible de mettre à jour le statut");
            }

            // si l'appel à l'API de mise à jour du statut de la commande est un succès, on affiche un message de succès pour indiquer que le statut de la commande a bien été mis à jour, et on met à jour le statut de la commande dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail
            setEmployeeStatus(`Commande #${id} mise à jour : ${result.status}`);

            // mise à jour du statut de la commande dans l'interface : pour l'instant on affiche juste un message de statut, mais on branchera ensuite la mise à jour réelle du statut de la commande dans l'interface pour que ce soit fonctionnel
            const refreshedOrders = await loadEmployeeOrders();
            currentOrders = refreshedOrders;

            // on met à jour la liste des commandes affichée dans l'interface pour refléter le changement de statut de la commande, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail
            refreshOrdersView();

            // si le détail de la commande affiché correspond à la commande qui vient d'être mise à jour, on met à jour le détail affiché pour refléter le changement de statut, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail
            const updatedOrder = currentOrders.find(order => String(order.id) === String(id));
            if (updatedOrder) {
                renderOrderDetail(updatedOrder);
            }

            // on affiche un message de succès pour indiquer que le statut de la commande a bien été mis à jour, et on met à jour le statut de la commande dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses commandes et puisse gérer efficacement son travail
        } catch (err) {
            setEmployeeStatus(`Erreur statut: ${err.message}`, false);
        }

        return;
    }
});

/* ------------------------------
        Actions Avis Clients
------------------------------ */

/* les actions liées à un avis client (valider/refuser) sont gérées ici, en fonction du data-review-action du bouton cliqué */
detailEl.addEventListener("click", async (e) => {
    /* on vérifie que le clic a eu lieu sur un bouton d'action lié à un avis client, en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec l'attribut data-review-action, pour éviter de gérer des clics qui ne sont pas liés à des actions sur les avis clients et de se concentrer uniquement sur les actions qui intéressent l'employé pour gérer efficacement les avis clients */
    const btn = e.target.closest("[data-review-action]");
    /* on vérifie que le clic a eu lieu sur un bouton d'action lié à un avis client, en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec l'attribut data-review-action */
    if (!btn) return;

    /* si on a trouvé un bouton d'action lié à un avis client, on récupère l'action correspondante et l'id de l'avis, puis on effectue l'action correspondante (valider/refuser) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    const action = btn.dataset.reviewAction;
    /* si on a trouvé un bouton d'action lié à un avis client, on récupère l'action correspondante et l'id de l'avis, puis on effectue l'action correspondante (valider/refuser) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    const id = btn.dataset.id;

    /* si on a trouvé un bouton d'action lié à un avis client, on récupère l'action correspondante et l'id de l'avis, puis on effectue l'action correspondante (valider/refuser) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    let endpoint = null;

    /* en fonction de l'action correspondante, on détermine l'endpoint de l'API correspondant à l'action (validation ou refus de l'avis), ce qui est important pour que l'appel à l'API puisse être effectué correctement et que l'employé puisse gérer efficacement les avis clients en validant ou refusant les avis qui nécessitent une action de sa part */
    if (action === "approve") {
        endpoint = `/api/employee/reviews/${encodeURIComponent(id)}/approve`;
    }

    /* en fonction de l'action correspondante, on détermine l'endpoint de l'API correspondant à l'action (validation ou refus de l'avis), ce qui est important pour que l'appel à l'API puisse être effectué correctement et que l'employé puisse gérer efficacement les avis clients en validant ou refusant les avis qui nécessitent une action de sa part */
    if (action === "reject") {
        endpoint = `/api/employee/reviews/${encodeURIComponent(id)}/reject`;
    }

    /* si on a trouvé un bouton d'action lié à un avis client, on détermine l'endpoint de l'API correspondant à l'action (validation ou refus de l'avis), puis on effectue l'appel à l'API pour effectuer l'action correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (!endpoint) return;

    try {
        /* on effectue l'appel à l'API de validation/refus de l'avis, en utilisant la méthode PATCH et en incluant les cookies pour l'authentification, et en gérant les erreurs de réseau pour éviter que l'application ne plante en cas de problème de connexion, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
        const res = await fetch(endpoint, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        /* on récupère le content-type de la réponse de l'API pour vérifier que c'est du JSON, et éviter les erreurs de parsing si ce n'est pas le cas */
        const contentType = res.headers.get("content-type") || "";
        /* on vérifie que le content-type de la réponse de l'API est bien du JSON, pour éviter les erreurs de parsing et afficher un message d'erreur clair si ce n'est pas le cas, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
        const isJson = contentType.includes("application/json");

        /* on essaie de parser la réponse en JSON si le content-type le permet, sinon on la traite comme du texte brut pour récupérer un éventuel message d'erreur, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
        const result = isJson
            /* on essaie de parser la réponse en JSON si le content-type le permet, sinon on la traite comme du texte brut, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
            ? await res.json().catch(() => null)
            /* si la réponse n'est pas du JSON, on essaie de la traiter comme du texte brut pour récupérer un éventuel message d'erreur, et on gère les erreurs de parsing pour éviter que l'application ne plante en cas de réponse mal formée, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
            : await res.text().catch(() => null);

        /* on vérifie que la réponse de l'API est bien un succès (code HTTP 200-299), sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
        if (!res.ok) {
            /* si la réponse de l'API n'est pas un succès (code HTTP 200-299), on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
            throw new Error(
                isJson
                    ? (result?.error || "Erreur lors de la mise à jour de l'avis")
                    : `HTTP ${res.status} - Réponse non JSON`
            );
        }

        /* on vérifie que la réponse de l'API est bien du JSON et que le champ success de la réponse est true, sinon on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
        if (!isJson || !result?.success) {
            /* si la réponse de l'API n'est pas du JSON ou que le champ success n'est pas true, on affiche une erreur avec le message d'erreur retourné par l'API ou un message générique si aucun message d'erreur n'est fourni, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
            throw new Error("La route des avis ne renvoie pas un JSON valide.");
        }

        /* si l'appel à l'API de validation/refus de l'avis est un succès, on affiche un message de succès pour indiquer que l'avis a bien été mis à jour, et on met à jour le statut de l'avis dans l'interface pour refléter ce changement, ce qui est important pour que l'employé ait une vue à jour de ses avis et puisse gérer efficacement son travail */
        setEmployeeStatus(`Avis #${id} mis à jour`);

        /* on met à jour la liste des avis affichée dans l'interface pour refléter le changement de statut de l'avis, ce qui est important pour que l'employé ait une vue à jour de ses avis et puisse gérer efficacement son travail */
        const refreshedReviews = await loadEmployeeReviews();
        currentReviews = refreshedReviews;
        refreshReviewsView();

    }
    catch (err) {
        setEmployeeStatus(`Erreur avis: ${err.message}`, false);
    }
});


/* ------------------------------
        Actions Menus
------------------------------ */

/* les actions liées à un menu (modifier/supprimer) sont gérées ici, en fonction du data-menu-action du bouton cliqué */
employeeMenuDetailEl?.addEventListener("click", async (e) => {
    /* on vérifie que le clic a eu lieu sur un bouton d'action lié à un menu, en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec l'attribut data-menu-action, pour éviter de gérer des clics qui ne sont pas liés à des actions sur les menus et de se concentrer uniquement sur les actions qui intéressent l'employé pour gérer efficacement les menus proposés aux clients */
    const btn = e.target.closest("[data-menu-action]");
    /* on vérifie que le clic a eu lieu sur un bouton d'action lié à un menu, en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec l'attribut data-menu-action */
    if (!btn) return;

    /* si on a trouvé un bouton d'action lié à un menu, on récupère l'action correspondante et l'id du menu, puis on effectue l'action correspondante (modifier/supprimer) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    const action = btn.dataset.menuAction;
    /* si on a trouvé un bouton d'action lié à un menu, on récupère l'action correspondante et l'id du menu, puis on effectue l'action correspondante (modifier/supprimer) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    const id = btn.dataset.id;

    /* si on a trouvé un bouton d'action lié à un menu, on récupère l'action correspondante et l'id du menu, puis on effectue l'action correspondante (modifier/supprimer) en appelant l'API correspondante, et on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (!id) return;

    /* si l'action correspondante est la modification du menu, on effectue l'action de modification en appelant l'API correspondante, puis on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, et on met à jour la liste des menus affichée dans l'interface pour refléter les changements, ce qui est important pour que l'employé ait une vue à jour de ses menus et puisse gérer efficacement son travail en modifiant les menus proposés aux clients en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (action === "edit") {
        await handleEditMenu(id);
        return;
    }

    /* si l'action correspondante est l'activation/désactivation du menu, on effectue l'action d'activation/désactivation en appelant l'API correspondante, puis on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, et on met à jour la liste des menus affichée dans l'interface pour refléter les changements, ce qui est important pour que l'employé ait une vue à jour de ses menus et puisse gérer efficacement son travail en modifiant les menus proposés aux clients en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (action === "toggle-active") {
        await handleToggleMenuActive(id);
        return;
    }

    /* si l'action correspondante est la suppression du menu, on effectue l'action de suppression en appelant l'API correspondante, puis on affiche un message de succès ou d'erreur en fonction du résultat de l'appel à l'API, et on met à jour la liste des menus affichée dans l'interface pour refléter les changements, ce qui est important pour que l'employé ait une vue à jour de ses menus et puisse gérer efficacement son travail en modifiant les menus proposés aux clients en fonction des besoins et des retours clients, tout en ayant un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant l'action ou en contactant le support) */
    if (action === "delete") {
        await handleDeleteMenu(id);
        return;
    }
});


/* ================================================
        SÉLECTION DES CARTES ET AFFICHAGE DU DÉTAIL
================================================ */

/* quand on clique sur une carte d'une commande, d'un menu ou d'un avis, on affiche le détail correspondant dans le panneau de droite */
document.addEventListener("click", (e) => {
    /* on vérifie que le clic a eu lieu sur une carte d'employé (commande, menu ou avis), en remontant dans la hiérarchie DOM jusqu'à trouver un élément avec la classe “employee-mini-card” */
    const card = e.target.closest(".employee-mini-card");
    if (!card) return;

    /* si on a trouvé une carte, on récupère le type (order/menu/review) et l'id correspondants, puis on affiche le détail correspondant dans le panneau de droite */
    const type = card.dataset.type;
    /* on récupère le type (order/menu/review) et l'id correspondants, puis on affiche le détail correspondant dans le panneau de droite */
    const id = card.dataset.id;

    /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
    if (type === "order") {
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        const order = currentOrders.find(item => String(item.id) === String(id));
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        if (order) renderOrderDetail(order);
    }
    /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
    if (type === "menu") {
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        const menu = currentMenus.find(item => String(item.id) === String(id));
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        if (menu) renderMenuDetail(menu);
    }
    /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
    if (type === "review") {
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        const review = currentReviews.find(item => String(item.id) === String(id));
        /* en fonction du type de la carte (commande, menu ou avis), on cherche les données correspondantes dans les listes de démonstration, et on affiche le détail correspondant dans le panneau de droite */
        if (review) renderReviewDetail(review);
    }
});


/* ========================================
        INITIALISATION DU DASHBOARD
======================================== */

(async function initEmployeeDashboard() {

    try {
        /* chargement des commandes depuis l'API */
        const orders = await loadEmployeeOrders();
        /* stockage des commandes chargées */
        currentOrders = orders;
        /* affichage détail de la première commande si la liste n'est pas vide, pour que l'employé ait directement une vue sur une commande à gérer en arrivant sur le dashboard, ce qui est important pour que l'employé puisse gérer efficacement ses commandes dès son arrivée sur le dashboard */
        refreshOrdersView();

        /* en cas d'erreur lors du chargement des commandes, on affiche un message d'erreur dans le statut de l'employé pour informer l'employé du problème, et on continue à charger les autres données (menus et avis) pour que l'employé puisse quand même gérer ces aspects de son travail même si les commandes ne sont pas disponibles, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant le chargement des commandes ou en contactant le support) */
    } catch (err) {
        setEmployeeStatus(`Erreur commandes: ${err.message}`, false);
    }


    try {
        /* chargement des avis depuis l'API */
        const reviews = await loadEmployeeReviews();
        /* stockage des avis chargés */
        currentReviews = reviews;
        /* affichage détail du premier avis si la liste n'est pas vide, pour que l'employé ait directement une vue sur un avis à gérer en arrivant sur le dashboard, ce qui est important pour que l'employé puisse gérer efficacement les avis clients dès son arrivée sur le dashboard */
        renderReviewsCards(currentReviews);

        /*en cas d'erreur lors du chargement des avis, on affiche un message d'erreur dans le statut de l'employé pour informer l'employé du problème, et on continue à charger les autres données (commandes et menus) pour que l'employé puisse quand même gérer ces aspects de son travail même si les avis clients ne sont pas disponibles, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant le chargement des avis ou en contactant le support) */
    } catch (err) {
        setEmployeeStatus(`Erreur avis: ${err.message}`, false);
    }


    try {
        /* chargement des menus depuis l'API */
        const menus = await loadEmployeeMenus();
        /* stockage des menus chargés */
        currentMenus = menus;
        /* affichage détail du premier menu si la liste n'est pas vide, pour que l'employé ait directement une vue sur un menu à gérer en arrivant sur le dashboard, ce qui est important pour que l'employé puisse gérer efficacement les menus proposés aux clients dès son arrivée sur le dashboard, et pour que l'employé puisse réagir rapidement en cas de besoin de modification des menus (par exemple en cas de rupture de stock d'un ingrédient) */
        refreshMenusView();


        /* en cas d'erreur lors du chargement des menus, on affiche un message d'erreur dans le statut de l'employé pour informer l'employé du problème, et on continue à charger les autres données (commandes et avis) pour que l'employé puisse quand même gérer ces aspects de son travail même si les menus ne sont pas disponibles, ce qui est important pour que l'employé ait un retour clair sur le résultat de son action et puisse réagir en conséquence en cas d'erreur (par exemple en réessayant le chargement des menus ou en contactant le support) */
    } catch (err) {
        setEmployeeStatus(`Erreur menus: ${err.message}`, false);

    }
})();