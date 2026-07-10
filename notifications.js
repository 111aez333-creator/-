import { collection, query, where, orderBy, onSnapshot, limit, writeBatch } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { escapeHtml } from "./utils.js";

let unsubscribeNoti = null;
let currentNotiDocs = [];

export const listenToNotifications = (currentUserId, showToast) => {
    if (unsubscribeNoti) unsubscribeNoti();
    const qNoti = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUserId),
        orderBy("timestamp", "desc"),
        limit(30)
    );

    unsubscribeNoti = onSnapshot(qNoti, (snapshot) => {
        const badge = document.getElementById("noti-count");
        const list = document.getElementById("noti-list");
        currentNotiDocs = snapshot.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() }));

        if (snapshot.empty) {
            if (badge) badge.hidden = true;
            if (list) list.innerHTML = `<div class="noti-item" style="text-align:center;color:#666;">لا توجد إشعارات بعد...</div>`;
            return;
        }

        const unreadCount = currentNotiDocs.filter((n) => !n.data.read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.hidden = false;
                const latest = currentNotiDocs[0].data;
                if (!latest.read && Date.now() - latest.timestamp < 3000) {
                    if (latest.type === "follow") showToast(`${latest.fromUserName} بدأ في متابعتك الآن!`, "success");
                    else if (latest.type === "like") showToast(`${latest.fromUserName} أعجب بعملك!`, "success");
                    else if (latest.type === "comment") showToast(`${latest.fromUserName} علّق على عملك!`, "success");
                }
            } else {
                badge.hidden = true;
            }
        }

        if (!list) return;
        list.innerHTML = "";
        currentNotiDocs.forEach(({ data: noti, id }) => {
            const icons = { like: "❤️", comment: "💬", follow: "👥" };
            const actions = {
                like: "أعجب بصورتك.",
                comment: "علّق على صورتك.",
                follow: "بدأ بمتابعتك الآن."
            };
            const icon = icons[noti.type] || "🔔";
            const actionText = actions[noti.type] || "تفاعل مع عملك.";
            const unreadStyle = noti.read ? "" : "background:rgba(0,173,181,0.08);font-weight:bold;";
            list.innerHTML += `<div class="noti-item" id="noti-item-${id}" style="${unreadStyle}">${icon} <b>${escapeHtml(noti.fromUserName)}</b> ${actionText}</div>`;
        });
    });
};

export const stopNotifications = () => {
    if (unsubscribeNoti) { unsubscribeNoti(); unsubscribeNoti = null; }
};

export const markNotificationsRead = async () => {
    const unread = currentNotiDocs.filter((n) => !n.data.read);
    if (unread.length === 0) return;
    try {
        const batch = writeBatch(db);
        unread.forEach((n) => batch.update(n.ref, { read: true }));
        await batch.commit();
    } catch (error) {
        console.error(error);
    }
};

export const setupNotificationUI = () => {
    const wrapper = document.getElementById("noti-wrapper-area");
    if (!wrapper) return;
    wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        const d = document.getElementById("noti-dropdown");
        const willOpen = d.style.display !== "block";
        d.style.display = willOpen ? "block" : "none";
        if (willOpen) markNotificationsRead();
    });
    window.addEventListener("click", () => {
        const d = document.getElementById("noti-dropdown");
        if (d) d.style.display = "none";
    });
};
