import {
    collection, doc, getDoc, getDocs, deleteDoc, updateDoc, addDoc,
    query, where, orderBy, limit, startAfter, documentId
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";
import { PAGE_SIZE } from "./config.js";
import { escapeHtml, sanitizeUrl, showToast } from "./utils.js";

let pageState = { filter: "الكل", searchQuery: "", lastDoc: null, hasMore: true, loading: false };
const galleryImages = {};

export const setupInfiniteScroll = () => {
    const anchor = document.getElementById("scroll-anchor");
    if (!anchor) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !pageState.loading && pageState.hasMore) {
                loadImagesPage(true);
            }
        });
    }, { rootMargin: "100px", threshold: 0.1 });
    observer.observe(anchor);
};

export const render = async (filter = "الكل", btn = null) => {
    if (btn) {
        document.querySelectorAll(".controls .filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
    }
    pageState = {
        filter,
        searchQuery: document.getElementById("search-input")?.value.trim() || "",
        lastDoc: null,
        hasMore: true,
        loading: false
    };
    const gallery = document.getElementById("gallery");
    if (gallery) gallery.innerHTML = "";
    await loadImagesPage(false);
};

const loadImagesPage = async (append) => {
    if (pageState.loading || (append && !pageState.hasMore)) return;
    pageState.loading = true;

    const gallery = document.getElementById("gallery");
    const loadMoreStatus = document.getElementById("load-more-status");
    const sortValue = document.getElementById("sort-select")?.value || "timestamp";

    if (!append && gallery) gallery.innerHTML = '<p class="loading-state">جاري تحميل المنصة...</p>';
    else if (loadMoreStatus) loadMoreStatus.textContent = "جاري تحميل المزيد...";

    const myId = auth.currentUser?.uid || null;
    const constraints = [];

    if (pageState.searchQuery) {
        constraints.push(where("tags", "array-contains", pageState.searchQuery.replace(/^#/, "").trim()));
    }
    if (pageState.filter !== "الكل") {
        constraints.push(where("cat", "==", pageState.filter));
    }

    let qConstraints = [...constraints, orderBy(sortValue, "desc"), orderBy(documentId()), limit(PAGE_SIZE)];
    if (append && pageState.lastDoc) {
        qConstraints = [...constraints, orderBy(sortValue, "desc"), orderBy(documentId()), startAfter(pageState.lastDoc), limit(PAGE_SIZE)];
    }

    let snapshot;
    try {
        snapshot = await getDocs(query(collection(db, "images"), ...qConstraints));
    } catch (error) {
        console.error(error);
        if (!append && gallery) {
            gallery.innerHTML = '<p class="error-state">تعذر جلب الأصول، يرجى فحص إعداد الفهرسة وقواعد الفايرستور.</p>';
        }
        pageState.loading = false;
        return;
    }

    if (!append && gallery) gallery.innerHTML = "";

    const docsToRender = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));

    if (docsToRender.length === 0 && !append) {
        if (gallery) gallery.innerHTML = '<p class="empty-state">لا توجد مشاركات إبداعية مطابقة...</p>';
        pageState.hasMore = false;
        pageState.loading = false;
        return;
    }

    pageState.hasMore = snapshot.docs.length === PAGE_SIZE;
    if (snapshot.docs.length > 0) pageState.lastDoc = snapshot.docs[snapshot.docs.length - 1];

    for (const item of docsToRender) {
        let faved = false;
        if (myId) {
            const favSnap = await getDoc(doc(db, "favorites", `${myId}_${item.id}`));
            faved = favSnap.exists();
        }
        appendImageCard(item.id, item.data, gallery, faved);
    }

    if (loadMoreStatus) loadMoreStatus.textContent = "";
    pageState.loading = false;
};

const appendImageCard = (imgId, item, container, isFaved) => {
    const userName = item.userName || "مستخدم مجهول";
    const category = item.cat || "إبداع";
    const userAvatar = sanitizeUrl(item.userAvatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`;
    const myId = auth.currentUser?.uid || null;
    const likesArray = item.likes || [];
    const isLiked = myId ? likesArray.includes(myId) : false;
    const src = sanitizeUrl(item.src) || item.src;

    let tagsHtml = "";
    if (item.tags?.length) {
        item.tags.forEach((tag) => {
            tagsHtml += `<span class="tag-badge" data-tag="${escapeHtml(tag)}" role="button" tabindex="0">#${escapeHtml(tag)}</span>`;
        });
    }

    galleryImages[imgId] = src;

    container.insertAdjacentHTML("beforeend", `
        <article class="photo-card" id="card-${escapeHtml(imgId)}">
            <div class="photo-header">
                <div class="photo-header-left">
                    <img src="${escapeHtml(userAvatar)}" class="avatar-img designer-profile-trigger" data-uid="${escapeHtml(item.userId)}" alt="صورة ${escapeHtml(userName)}" width="34" height="34" loading="lazy">
                    <h3 class="photo-title" style="margin:0;">${escapeHtml(category)} — بواسطة ${escapeHtml(userName)}</h3>
                </div>
                <button class="fav-container" data-imgid="${escapeHtml(imgId)}" aria-label="${isFaved ? "إزالة من المفضلة" : "إضافة للمفضلة"}">
                    <span class="fav-btn ${isFaved ? "faved" : ""}" id="fav-${escapeHtml(imgId)}" aria-hidden="true">${isFaved ? "⭐" : "☆"}</span>
                </button>
            </div>
            <div class="designer-info-action">
                <button class="mini-btn designer-profile-trigger" data-uid="${escapeHtml(item.userId)}">👤 ملف المصمم</button>
            </div>
            ${myId && item.userId === myId ? `<button class="del-btn" data-imgid="${escapeHtml(imgId)}" aria-label="حذف الصورة">×</button>` : ""}
            <div class="image-wrapper">
                <img class="photo-img" src="${escapeHtml(src)}" alt="${escapeHtml(category)} بواسطة ${escapeHtml(userName)}"
                     loading="lazy" decoding="async" data-imgid="${escapeHtml(imgId)}">
            </div>
            <div class="tags-container">${tagsHtml}</div>
            <div class="interaction-bar">
                <button class="like-container" data-imgid="${escapeHtml(imgId)}" data-likes='${JSON.stringify(likesArray)}' data-ownerid="${escapeHtml(item.userId)}" aria-label="إعجاب">
                    <span class="like-btn ${isLiked ? "liked" : ""}" id="heart-${escapeHtml(imgId)}" aria-hidden="true">${isLiked ? "❤️" : "🤍"}</span>
                    <span class="like-count" id="count-${escapeHtml(imgId)}">${likesArray.length} إعجاب</span>
                </button>
                <div class="share-actions">
                    <button class="share-btn whatsapp" data-src="${escapeHtml(src)}" data-category="${escapeHtml(category)}" aria-label="مشاركة عبر واتساب">💬</button>
                    <button class="share-btn facebook" data-src="${escapeHtml(src)}" aria-label="مشاركة عبر فيسبوك">👥</button>
                    <button class="report-btn share-btn" data-targetid="${escapeHtml(imgId)}" data-type="image" aria-label="إبلاغ">🚩</button>
                </div>
            </div>
        </article>
    `);

    const img = container.querySelector(`#card-${CSS.escape(imgId)} .photo-img`);
    if (img) {
        img.addEventListener("load", () => img.classList.add("loaded"));
        img.addEventListener("click", (e) => window.openLightboxImage(e, src));
        if (img.complete) img.classList.add("loaded");
    }
};

export const toggleFavorite = async (imageId) => {
    if (!auth.currentUser) {
        showToast("يرجى تسجيل الدخول لحفظ المفضلات.", "error");
        return;
    }
    const myUid = auth.currentUser.uid;
    const favRef = doc(db, "favorites", `${myUid}_${imageId}`);
    const fSnap = await getDoc(favRef);
    const favIcon = document.getElementById(`fav-${imageId}`);
    const isFaved = fSnap.exists();

    if (isFaved) {
        await deleteDoc(favRef);
        if (favIcon) { favIcon.textContent = "☆"; favIcon.classList.remove("faved"); }
        showToast("تمت الإزالة من المفضلة.", "info");
    } else {
        await setDoc(favRef, { userId: myUid, imageId, timestamp: Date.now() });
        if (favIcon) { favIcon.textContent = "⭐"; favIcon.classList.add("faved"); }
        showToast("تمت الإضافة للمفضلة بنجاح!", "success");
    }
};

export const toggleLike = async (imageId, likesArray, postOwnerId, containerEl) => {
    if (!auth.currentUser) {
        showToast("يجب تسجيل الدخول أولاً لإبداء الإعجاب!", "error");
        return;
    }
    const myId = auth.currentUser.uid;
    const hasLiked = likesArray.includes(myId);
    const updatedLikes = hasLiked ? likesArray.filter((id) => id !== myId) : [...likesArray, myId];

    const heartEl = document.getElementById(`heart-${imageId}`);
    const countEl = document.getElementById(`count-${imageId}`);
    if (heartEl && countEl) {
        heartEl.textContent = hasLiked ? "🤍" : "❤️";
        heartEl.classList.toggle("liked");
        countEl.textContent = `${updatedLikes.length} إعجاب`;
        containerEl.setAttribute("data-likes", JSON.stringify(updatedLikes));
    }

    try {
        await updateDoc(doc(db, "images", imageId), { likes: updatedLikes, likesCount: updatedLikes.length });
        if (!hasLiked && postOwnerId !== myId) {
            await addDoc(collection(db, "notifications"), {
                toUserId: postOwnerId,
                fromUserId: myId,
                fromUserName: auth.currentUser.displayName || "مستخدم مجهول",
                type: "like",
                imageId,
                read: false,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error(error);
    }
};

export const deleteImage = async (id) => {
    if (!confirm("هل تريد حذف هذه الصورة نهائياً؟")) return;
    document.getElementById(`card-${id}`)?.remove();
    try {
        await deleteDoc(doc(db, "images", id));
        showToast("تمت إزالة الصورة نهائياً.", "success");
    } catch {
        showToast("فشل إزالة العمل.", "error");
    }
};

export const setupGalleryUI = () => {
    document.getElementById("search-btn")?.addEventListener("click", () => render("الكل"));
    document.getElementById("search-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") render("الكل");
    });
    document.querySelectorAll(".controls .filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => render(btn.getAttribute("data-category"), btn));
    });
};

export const setupGalleryEvents = (openUserProfile) => {
    document.addEventListener("click", async (e) => {
        const target = e.target;

        if (target.closest(".designer-profile-trigger")) {
            openUserProfile(target.closest(".designer-profile-trigger").getAttribute("data-uid"));
        }
        if (target.closest(".fav-container")) {
            toggleFavorite(target.closest(".fav-container").getAttribute("data-imgid"));
        }
        if (target.closest(".like-container")) {
            const btn = target.closest(".like-container");
            toggleLike(
                btn.getAttribute("data-imgid"),
                JSON.parse(btn.getAttribute("data-likes") || "[]"),
                btn.getAttribute("data-ownerid"),
                btn
            );
        }
        if (target.closest(".del-btn")) {
            deleteImage(target.closest(".del-btn").getAttribute("data-imgid"));
        }
        if (target.closest(".profile-tab")) {
            const { switchProfileTab } = await import("./profile.js");
            switchProfileTab(target.closest(".profile-tab").getAttribute("data-tab"));
        }
        if (target.closest(".tag-badge")) {
            const tag = target.closest(".tag-badge").getAttribute("data-tag");
            const searchInput = document.getElementById("search-input");
            if (searchInput) { searchInput.value = tag; render("الكل"); }
        }
        if (target.closest(".whatsapp")) {
            const btn = target.closest(".whatsapp");
            const url = `https://wa.me/?text=${encodeURIComponent(btn.getAttribute("data-category") + " - " + btn.getAttribute("data-src"))}`;
            window.open(url, "_blank", "noopener,noreferrer");
        }
        if (target.closest(".facebook")) {
            const btn = target.closest(".facebook");
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(btn.getAttribute("data-src"))}`;
            window.open(url, "_blank", "noopener,noreferrer");
        }
    });
};
