import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";
import { IMGBB_API_KEY, MAX_IMAGE_SIZE_MB, MAX_TAGS, MAX_TAG_LENGTH } from "./config.js";
import { compressImageToWebP, parseTags, showToast } from "./utils.js";
import { render } from "./gallery.js";

export const setupUpload = () => {
    const dragDropZone = document.getElementById("upload-section-box");
    const uploadInput = document.getElementById("upload");
    if (!dragDropZone || !uploadInput) return;

    document.getElementById("select-file-btn")?.addEventListener("click", () => uploadInput.click());

    dragDropZone.addEventListener("dragover", (e) => { e.preventDefault(); dragDropZone.classList.add("highlight"); });
    dragDropZone.addEventListener("dragleave", () => dragDropZone.classList.remove("highlight"));
    dragDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dragDropZone.classList.remove("highlight");
        if (e.dataTransfer.files.length > 0) {
            uploadInput.files = e.dataTransfer.files;
            uploadInput.dispatchEvent(new Event("change"));
        }
    });

    uploadInput.addEventListener("change", async function () {
        const file = uploadInput.files[0];
        if (!file) return;

        const statusText = document.getElementById("upload-status");
        const spinner = document.getElementById("uploadSpinner");

        if (!auth.currentUser) { showToast("يرجى تسجيل الدخول للرفع.", "error"); return; }
        if (!file.type.startsWith("image/")) { showToast("الملف المختار ليس صورة صالحة.", "error"); return; }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showToast(`حجم الصورة يجب أن لا يتجاوز ${MAX_IMAGE_SIZE_MB} ميجابايت.`, "error");
            return;
        }

        statusText.textContent = "جاري تحويل وضغط الصورة...";
        spinner.style.display = "block";

        try {
            const webpBlob = await compressImageToWebP(file);
            statusText.textContent = "جاري الرفع الآمن...";

            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.readAsDataURL(webpBlob);
            });

            const formData = new FormData();
            formData.append("image", base64);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const result = await res.json();
            if (!result.success) throw new Error("فشل الرفع");

            const tagInputValue = document.getElementById("tagInput")?.value || "";
            const parsedTags = parseTags(tagInputValue, MAX_TAGS, MAX_TAG_LENGTH);

            await addDoc(collection(db, "images"), {
                src: result.data.url,
                cat: document.getElementById("catSelect")?.value || "أنمي",
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName,
                userAvatar: auth.currentUser.photoURL || "",
                likes: [],
                likesCount: 0,
                tags: parsedTags,
                timestamp: Date.now()
            });

            statusText.textContent = "✅ تم النشر بنجاح!";
            showToast("تم نشر تصميمك بنجاح!", "success");
            document.getElementById("tagInput").value = "";
            render();
        } catch (error) {
            console.error(error);
            showToast("تعذر إتمام رفع الملف.", "error");
        } finally {
            spinner.style.display = "none";
            uploadInput.value = "";
        }
    });
};
