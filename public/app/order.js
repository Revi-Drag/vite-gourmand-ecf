const menuInfo = document.getElementById("menuInfo");
const priceBox = document.getElementById("priceBox");
const statusEl = document.getElementById("status");

const form = document.getElementById("orderForm");
const eventAddress = document.getElementById("eventAddress");
const eventCity = document.getElementById("eventCity");
const distanceKm = document.getElementById("distanceKm");
const eventDate = document.getElementById("eventDate");
const eventPhone = document.getElementById("eventPhone");
const persons = document.getElementById("persons");

const params = new URLSearchParams(location.search);
const menuId = params.get("menuId");

let menu = null;

function euro(n) {
    return Number(n).toFixed(2) + " €";
}

function isBordeaux(city) {
    return String(city || "").trim().toLowerCase() === "bordeaux";
}

function computePrices() {
    if (!menu) return;

    const p = persons.value ? Number(persons.value) : 0;
    const min = Number(menu.minPersons);
    const base = Number(menu.price); // for minPersons

    if (!p) {
        priceBox.textContent = "—";
        return;
    }

    if (p < min) {
        priceBox.innerHTML = `⚠️ Minimum requis : <strong>${min}</strong> personnes.`;
        return;
    }

    const unit = base / Math.max(min, 1);
    let menuPrice = unit * p;

    let discount = false;
    if (p >= (min + 5)) {
        menuPrice *= 0.90;
        discount = true;
    }

    const city = eventCity.value;
    const km = distanceKm.value ? Number(distanceKm.value) : 0;

    let delivery = 0;
    if (!isBordeaux(city)) {
        delivery = 5 + 0.59 * km;
    }

    const total = menuPrice + delivery;

    priceBox.innerHTML = `
    <div>Prix menu (calculé) : <strong>${euro(menuPrice)}</strong>${discount ? " <span class='badge'>-10%</span>" : ""}</div>
    <div>Livraison : <strong>${euro(delivery)}</strong> ${isBordeaux(city) ? "(Bordeaux)" : "(hors Bordeaux)"} </div>
    <div style="margin-top:6px;">Total : <strong>${euro(total)}</strong></div>
  `;
}

async function loadMenu() {
    const res = await fetch(`/api/menus/${menuId}`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
        menuInfo.textContent = "Menu introuvable.";
        form.style.display = "none";
        return;
    }

    const data = await res.json().catch(() => null);
    if (!data || !data.success || !data.item) {
        menuInfo.textContent = "Menu introuvable.";
        form.style.display = "none";
        return;
    }

    menu = data.item;

    // ✅ sur l'API publique c'est "price" (pas basePrice)
    menuInfo.innerHTML = `<strong>${menu.title}</strong> — min ${menu.minPersons} pers — ${euro(menu.price)} (prix de base)`;
    persons.min = String(menu.minPersons);
    persons.placeholder = `min ${menu.minPersons}`;

    computePrices();
}


function wire() {
    ["input", "change"].forEach((evt) => {
        eventCity.addEventListener(evt, computePrices);
        distanceKm.addEventListener(evt, computePrices);
        persons.addEventListener(evt, computePrices);
    });
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "Envoi…";

    const payload = {
        menuId: Number(menuId),
        persons: Number(persons.value),
        eventAddress: eventAddress.value,
        eventCity: eventCity.value,
        distanceKm: distanceKm.value ? Number(distanceKm.value) : 0,
        eventDate: eventDate.value,
        eventPhone: eventPhone.value,
    };

    const res = await fetch(`/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
    });

    const out = await res.json().catch(() => ({}));

    if (res.status === 401) {
        // pas connecté -> redirection login
        location.href = `./login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`;
        return;
    }

    if (!res.ok || !out.success) {
        statusEl.textContent = out.error ? `Erreur: ${out.error}` : `Erreur HTTP ${res.status}`;
        return;
    }

    statusEl.textContent = `OK ✅ Commande #${out.order.id} (${out.order.status})`;
});

(async function init() {
    if (!menuId) {
        menuInfo.textContent = "Aucun menu sélectionné.";
        form.style.display = "none";
        return;
    }
    wire();
    await loadMenu();
})();
