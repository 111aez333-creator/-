import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    addDoc, query, where, orderBy, limit, startAfter, documentId, writeBatch
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";
import { PAGE_SIZE, MAX_BIO_LENGTH, MAX_NAME_LENGTH } from "./config.js";
import { escapeHtml, sanitizeUrl, showToast } from "./utils.js";
import { switchSection } from "./navigation.js";

let selectedProfileUserId = null;

export const syncUserProfile = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const existing = userSnap.exists() ? userSnap.data() : {};

    await setDoc(userRef, {
        uid: user.uid,
        displayName: existing.displayName || user.displayName || "مبدع مجهول",
        photoURL: existing.photoURL || user.photoURL || "",
        joinedAt: existing.joinedAt || Date.now(),
        bio: existing.bio || ""
    }, { merge: true });
};

export const openUserProfile = async (userId) => {
    selectedProfileUserId = userId;
    switchSection("profile-view");

    const isMe = auth.currentUser?.uid === userId;
    document.getElementById("edit-profile-trigger").hidden = !isMe;

    const followBtn = document.getElementById("follow-action-btn");
    if (auth.currentUser && !isMe) {
        followBtn.hidden = false;
        await checkFollowState(auth.currentUser.uid, userId);
    } else {
        followBtn.hidden = true;
    }

    const uSnap = await getDoc(doc(db, "users", userId));
    if (uSnap.exists()) {
        const uData = uSnap.data();
        document.getElementById("p-name").textContent = uData.displayName;
        document.getElementById("p-bio").textContent = uData.bio || "لا توجد نبذة تعريفية مكتوبة بعد...";
        const avatarUrl = sanitizeUrl(uData.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(uData.displayName)}`;
        document.getElementById("p-avatar").src = avatarUrl;
        document.getElementById("edit-p-name").value = uData.displayName;
        document.getElementById("edit-p-bio").value = uData.bio || "";
        document.getElementById("edit-p-avatar").value = uData.photoURL || "";
    }

    await loadProfileStatsAndContent(userId);
};

const checkFollowState = async (myUid, targetUid) => {
    const fSnap = await getDoc(doc(db, "follows", `${myUid}_${targetUid}`));
    const followBtn = document.getElementById("follow-action-btn");
    if (fSnap.exists()) {
        followBtn.textContent = "✓ إلغاء المتابعة";
        followBtn.style.background = "#555";
    } else {
        followBtn.textContent = "+ متابعة";
        followBtn.style.background = "var(--accent)";
    }
};

export const toggleFollow = async () => {
    if (!auth.currentUser || !selectedProfileUserId) return;
    const myUid = auth.currentUser.uid;
    const targetUid = selectedProfileUserId;
    if (myUid === targetUid) return;

    const followRef = doc(db, "follows", `${myUid}_${targetUid}`);
    const fSnap = await getDoc(followRef);
    const batch = writeBatch(db);

    if (fSnap.exists()) {
        batch.delete(followRef);
        showToast("تم إلغاء متابعة المصمم.", "info");
    } else {
        batch.set(followRef, { followerId: myUid, followingId: targetUid, timestamp: Date.now() });
        showToast("تمت متابعة المصمم بنجاح!", "success");
        await addDoc(collection(db, "notifications"), {
            toUserId: targetUid,
            fromUserId: myUid,
            fromUserName: auth.currentUser.displayName || "متابع جديد",
            type: "follow",
            read: false,
            timestamp: Date.now()
        });
    }
    await batch.commit();
    await checkFollowState(myUid, targetUid);
    await loadProfileStatsAndContent(targetUid);
};

const loadProfileStatsAndContent = async (userId) => {
    const [followingSnap, followersSnap, designsSnap] = await Promise.all([
        getDocs(query(collection(db, "follows"), where("followerId", "==", userId))),
        getDocs(query(collection(db, "follows"), where("followingId", "==", userId))),
        getDocs(query(collection(db, "images"), where("userId", "==", userId)))
    ]);

    document.getElementById("stat-posts-count").textContent = designsSnap.size;
    document.getElementById("stat-followers-count").textContent = followersSnap.size;
    document.getElementById("stat-following-count").textContent = followingSnap.size;

    let totalLikes = 0;
    designsSnap.forEach((d) => { totalLikes += (d.data().likes || []).length; });
    document.getElementById("stat-likes-count").textContent = totalLikes;

    await switchProfileTab("my-designs");
};

export const switchProfileTab = async (tabName) => {
    document.querySelectorAll(".profile-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    const container = document.getElementById("profile-gallery-list");
    container.innerHTML = '<p class="loading-state">جاري التحميل...</p>';

    if (tabName === "my-designs") {
        const snap = await getDocs(query(
            collection(db, "images"),
            where("userId", "==", selectedProfileUserId),
            orderBy("timestamp", "desc")
        ));
        renderStaticCards(snap, container);
    } else if (tabName === "my-favorites") {
        const favSnap = await getDocs(query(collection(db, "favorites"), where("userId", "==", selectedProfileUserId)));
        if (favSnap.empty) {
            container.innerHTML = '<p class="empty-state">لا توجد تصميمات مفضلة بعد...</p>';
            return;
        }
        const imgIds = favSnap.docs.map((d) => d.data().imageId);
        const docsToFetch = [];
        for (let i = 0; i < imgIds.length; i += 10) {
            const batch = imgIds.slice(i, i + 10);
            const imgsSnap = await getDocs(query(collection(db, "images"), where(documentId(), "in", batch)));
            imgsSnap.forEach((docSnap) => docsToFetch.push(docSnap));
        }
        renderStaticCardsDirectly(docsToFetch, container);
    } else if (tabName === "followers-list") {
        const fSnap = await getDocs(query(collection(db, "follows"), where("followingId", "==", selectedProfileUserId)));
        if (fSnap.empty) {
            container.innerHTML = '<p class="empty-state">لا يوجد متابعون للملف حالياً...</p>';
            return;
        }
        container.innerHTML = "";
        for (const uid of fSnap.docs.map((d) => d.data().followerId)) {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (!userDoc.exists()) continue;
            const u = userDoc.data();
            const avatar = sanitizeUrl(u.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}`;
            container.insertAdjacentHTML("beforeend", `
                <div class="follower-item">
                    <div class="follower-info">
                        <img src="${escapeHtml(avatar)}" alt="" width="40" height="40" loading="lazy">
                        <strong>${escapeHtml(u.displayName)}</strong>
                    </div>
                    <button class="mini-btn view-user-btn" data-uid="${escapeHtml(uid)}">زيارة الملف</button>
                </div>
            `);
        }
        container.querySelectorAll(".view-user-btn").forEach((btn) => {
            btn.addEventListener("click", () => openUserProfile(btn.getAttribute("data-uid")));
        });
    }
};

const renderStaticCards = (snapshot, container) => {
    container.innerHTML = "";
    if (snapshot.empty) {
        container.innerHTML = '<p class="empty-state">لا توجد تصاميم بعد...</p>';
        return;
    }
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const src = sanitizeUrl(item.src) || item.src;
        const card = document.createElement("div");
        card.className = "photo-card";
        card.innerHTML = `
            <div class="image-wrapper">
                <img class="photo-img loaded" src="${escapeHtml(src)}" alt="${escapeHtml(item.cat || "تصميم")}" loading="lazy">
            </div>
        `;
        card.querySelector("img").addEventListener("click", (e) => window.openLightboxImage(e, src));
        container.appendChild(card);
    });
};

const renderStaticCardsDirectly = (docs, container) => {
    container.innerHTML = "";
    docs.forEach((docSnap) => {
        const item = docSnap.data();
        const src = sanitizeUrl(item.src) || item.src;
        const card = document.createElement("div");
        card.className = "photo-card";
        card.innerHTML = `
            <div class="image-wrapper">
                <img class="photo-img loaded" src="${escapeHtml(src)}" alt="${escapeHtml(item.cat || "تصميم")}" loading="lazy">
            </div>
        `;
        card.querySelector("img").addEventListener("click", (e) => window.openLightboxImage(e, src));
        container.appendChild(card);
    });
};

export const setupProfileUI = () => {
    document.getElementById("edit-profile-trigger")?.addEventListener("click", () => {
        const form = document.getElementById("profile-edit-form");
        form.hidden = false;
        form.style.display = "grid";
    });
    document.getElementById("cancel-edit-profile")?.addEventListener("click", () => {
        const form = document.getElementById("profile-edit-form");
        form.hidden = true;
        form.style.display = "";
    });
    document.getElementById("follow-action-btn")?.addEventListener("click", toggleFollow);

    document.getElementById("profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        const newName = document.getElementById("edit-p-name").value.trim().slice(0, MAX_NAME_LENGTH);
        const newBio = document.getElementById("edit-p-bio").value.trim().slice(0, MAX_BIO_LENGTH);
        const newAvatar = sanitizeUrl(document.getElementById("edit-p-avatar").value.trim());
        if (!newName) return;

        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                displayName: newName,
                bio: newBio,
                photoURL: newAvatar
            });
            showToast("تم تحديث بيانات الملف الشخصي بنجاح!", "success");
            const form = document.getElementById("profile-edit-form");
            form.hidden = true;
            form.style.display = "";
            await openUserProfile(auth.currentUser.uid);
        } catch {
            showToast("حدث خطأ أثناء حفظ التغييرات.", "error");
        }
    });
};
