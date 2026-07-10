export const switchSection = (sectionId) => {
    document.querySelectorAll(".view-section").forEach((sec) => sec.classList.remove("active"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
};

export const setupNavigation = (callbacks) => {
    document.querySelectorAll(".tab-trigger").forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
            e.preventDefault();
            const targetViewId = trigger.getAttribute("data-target");
            if (targetViewId === "profile-view" && callbacks.onProfile) {
                const ok = callbacks.onProfile();
                if (!ok) return;
            }
            switchSection(targetViewId);
            document.querySelectorAll(".nav-tab-btn").forEach((btn) => btn.classList.remove("active"));
            const navBtn = document.querySelector(`.nav-tab-btn[data-target="${targetViewId}"]`);
            if (navBtn) navBtn.classList.add("active");
        });
    });
};

export const setupRouting = () => {
    const handleRouting = () => {
        const hash = window.location.hash;
        if (hash === "#privacy") switchSection("privacy-view");
        else if (hash === "#terms") switchSection("terms-view");
        else switchSection("gallery-view");
    };
    window.addEventListener("hashchange", handleRouting);
    window.addEventListener("load", handleRouting);
    window.goToHome = () => {
        window.location.hash = "";
        switchSection("gallery-view");
    };
};

export const setupTheme = () => {
    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light-mode");
    }
    document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    });
};

export const setupOfflineDetection = (showToast) => {
    const banner = document.getElementById("offline-warning");
    window.addEventListener("online", () => {
        if (banner) banner.style.display = "none";
        showToast("عادت شبكة الاتصال للعمل!", "success");
    });
    window.addEventListener("offline", () => {
        if (banner) banner.style.display = "block";
        showToast("أنت تعمل حالياً بدون اتصال.", "error");
    });
    if (!navigator.onLine && banner) banner.style.display = "block";
};
