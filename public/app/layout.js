console.log("layout.js chargé");

import { applyAuthUI } from "./auth.js";
import { initHeaderMenu } from "./header.js";

export async function loadLayout() {
    try {
        console.log("loadLayout() start");

        const headerHtml = await fetch("./partials/header.html").then(r => r.text());
        const footerHtml = await fetch("./partials/footer.html").then(r => r.text());

        const headerTarget = document.getElementById("appHeader");
        const footerTarget = document.getElementById("appFooter");

        console.log("headerTarget:", document.getElementById("appHeader"));
        console.log("footerTarget:", document.getElementById("appFooter"));

        if (headerTarget) headerTarget.innerHTML = headerHtml;
        if (footerTarget) footerTarget.innerHTML = footerHtml;

        initHeaderMenu();
        await applyAuthUI();
    } catch (e) {
        console.error("Layout load error:", e);
    }
}
