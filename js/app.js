import { showToast } from "./utils.js";
import { setupRouting, setupTheme, setupOfflineDetection } from "./navigation.js";
import { initLightbox } from "./lightbox.js";
import { setupNotificationUI } from "./notifications.js";
import { setupProfileUI, openUserProfile } from "./profile.js";
import { setupGalleryUI, setupGalleryEvents } from "./gallery.js";
import { setupUpload } from "./upload.js";
import { setupAuthUI, initAuth } from "./auth.js";

const registerServiceWorker = () => {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js")
                .then(() => console.log("PWA Service Worker registered"))
                .catch((err) => console.log("SW registration failed:", err));
        });
    }
};

const init = () => {
    setupRouting();
    setupTheme();
    setupOfflineDetection(showToast);
    initLightbox();
    setupNotificationUI();
    setupProfileUI();
    setupGalleryUI();
    setupGalleryEvents(openUserProfile);
    setupUpload();
    setupAuthUI();
    initAuth(showToast);
    registerServiceWorker();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
