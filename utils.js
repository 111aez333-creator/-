export const escapeHtml = (str) => {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const sanitizeUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    try {
        const parsed = new URL(url.trim());
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
            return parsed.href;
        }
    } catch {}
    return "";
};

export const showToast = (message, type = "info") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");

    const bg =
        type === "error"
            ? "#ff4757"
            : type === "success"
            ? "#2ed573"
            : "#00adb5";

    toast.setAttribute("role", "status");
    toast.style.cssText = `
        background:${bg};
        color:#fff;
        padding:12px 24px;
        border-radius:8px;
        font-size:14px;
        box-shadow:0 4px 12px rgba(0,0,0,.15);
        animation:fadeIn .3s;
        pointer-events:auto;
        max-width:min(90vw,360px);
    `;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut .3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

/* ===========================================================
   ضغط الصور الاحترافي
=========================================================== */

export const compressImageToWebP = (file) => {
    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = (event) => {

            const img = new Image();

            img.onload = () => {

                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1600;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round(height * MAX_SIZE / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round(width * MAX_SIZE / height);
                        height = MAX_SIZE;
                    }
                }

                const canvas = document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.82;

                if (file.size > 10 * 1024 * 1024) {
                    quality = 0.55;
                } else if (file.size > 5 * 1024 * 1024) {
                    quality = 0.65;
                } else if (file.size > 2 * 1024 * 1024) {
                    quality = 0.72;
                }

                canvas.toBlob((blob) => {

                    if (!blob) {
                        reject(new Error("فشل ضغط الصورة"));
                        return;
                    }

                    console.log(
                        `📷 ${(file.size / 1024 / 1024).toFixed(2)} MB ➜ ${(blob.size / 1024 / 1024).toFixed(2)} MB`
                    );

                    resolve(blob);

                }, "image/webp", quality);

            };

            img.onerror = () => reject(new Error("ملف الصورة تالف"));

            img.src = event.target.result;
        };

        reader.onerror = (e) => reject(e);

        reader.readAsDataURL(file);

    });
};

export const parseTags = (input, maxTags, maxLength) => {
    if (!input) return [];

    return input
        .split(/[،,]+/)
        .map((t) => t.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxTags);
};