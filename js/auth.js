import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { auth, provider } from "./firebase-init.js";
import { showToast } from "./utils.js";
import { syncUserProfile } from "./profile.js";
import { listenToNotifications, stopNotifications } from "./notifications.js";
import { setupNavigation, setupInfiniteScroll } from "./navigation.js";
import { render } from "./gallery.js";
import { openUserProfile } from "./profile.js";

export const setupAuthUI = () => {
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        signOut(auth).then(() => location.reload());
    });

    const showLogin = () => {
        document.getElementById("login-screen").style.display = "block";
    };

    document.getElementById("login-nav-btn")?.addEventListener("click", showLogin);
    document.getElementById("login-bar-btn")?.addEventListener("click", showLogin);
    document.getElementById("close-login-screen")?.addEventListener("click", () => {
        document.getElementById("login-screen").style.display = "none";
    });

    document.getElementById("google-login")?.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, provider);
            document.getElementById("login-screen").style.display = "none";
            showToast("تم الدخول بنجاح!", "success");
        } catch {
            showToast("فشلت المحاولة، يرجى إعادة المحاولة.", "error");
        }
    });
};

export const initAuth = (showToastFn) => {
    onAuthStateChanged(auth, async (user) => {
        const els = {
            loginBar: document.getElementById("login-bar"),
            loginNavBtn: document.getElementById("login-nav-btn"),
            logoutBtn: document.getElementById("logout-btn"),
            uploadSection: document.getElementById("upload-section-box"),
            notiWrapper: document.getElementById("noti-wrapper-area"),
            welcomeMsg: document.getElementById("welcome-msg"),
            headerAvatar: document.getElementById("header-avatar"),
            navProfileBtn: document.getElementById("nav-profile-btn")
        };

        if (user) {
            els.loginBar.hidden = true;
            els.loginNavBtn.hidden = true;
            els.logoutBtn.hidden = false;
            els.uploadSection.hidden = false;
            els.notiWrapper.hidden = false;
            els.navProfileBtn.hidden = false;
            els.welcomeMsg.textContent = "مرحباً بك، " + (user.displayName || "مبدع");
            if (user.photoURL) {
                els.headerAvatar.src = user.photoURL;
                els.headerAvatar.hidden = false;
                els.headerAvatar.alt = user.displayName;
            }
            await syncUserProfile(user);
            listenToNotifications(user.uid, showToastFn);
        } else {
            stopNotifications();
            els.loginBar.hidden = false;
            els.loginNavBtn.hidden = false;
            els.logoutBtn.hidden = true;
            els.uploadSection.hidden = true;
            els.notiWrapper.hidden = true;
            els.navProfileBtn.hidden = true;
            els.welcomeMsg.textContent = "زائر المنصة";
            els.headerAvatar.hidden = true;
        }

        setupNavigation({
            onProfile: () => {
                if (!auth.currentUser) {
                    showToastFn("يرجى تسجيل الدخول لعرض ملفك الشخصي.", "error");
                    return false;
                }
                openUserProfile(auth.currentUser.uid);
                return true;
            }
        });

        setupInfiniteScroll();
        render();
    });
};
