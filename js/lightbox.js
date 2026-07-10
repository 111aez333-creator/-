import { sanitizeUrl } from "./utils.js";

let zoomScale = 1;
let lightboxImg = null;

const updateZoom = () => {
    if (lightboxImg) lightboxImg.style.transform = `scale(${zoomScale})`;
};

const trapFocus = (overlay) => {
    const focusable = overlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    overlay.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
};

export const initLightbox = () => {
    const overlay = document.getElementById("customLightbox");
    lightboxImg = document.getElementById("customLightboxImg");
    if (!overlay || !lightboxImg) return;

    const close = () => {
        overlay.style.display = "none";
        overlay.hidden = true;
        lightboxImg.src = "";
        lightboxImg.removeAttribute("src");
        document.body.style.overflow = "";
    };

    document.getElementById("zoom-in")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (zoomScale < 3) { zoomScale += 0.25; updateZoom(); }
    });
    document.getElementById("zoom-out")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (zoomScale > 0.5) { zoomScale -= 0.25; updateZoom(); }
    });
    document.getElementById("zoom-reset")?.addEventListener("click", (e) => {
        e.stopPropagation();
        zoomScale = 1;
        updateZoom();
    });

    overlay.addEventListener("click", close);
    document.getElementById("closeLightboxBtn")?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
        if (overlay.style.display === "flex" && e.key === "Escape") close();
    });

    trapFocus(overlay);

    window.openLightboxImage = (event, src) => {
        if (event) event.preventDefault();
        const safeSrc = sanitizeUrl(src);
        if (!safeSrc) return;
        zoomScale = 1;
        updateZoom();
        lightboxImg.src = safeSrc;
        overlay.hidden = false;
        overlay.style.display = "flex";
        document.body.style.overflow = "hidden";
        document.getElementById("closeLightboxBtn")?.focus();
    };
};
