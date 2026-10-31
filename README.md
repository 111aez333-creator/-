# سوق الجزائر — خطوات النشر

1. **القواعد:** `firebase deploy --only firestore:rules` (أو انسخ `firestore.rules` في Firebase Console → Firestore → Rules → Publish).
2. **الموقع:** `firebase deploy --only hosting` (المشروع `gallery-3008c` مكتوب في `.firebaserc`).
3. **App Check:** Firebase Console → App Check → سجّل تطبيق الويب بـ reCAPTCHA Enterprise بنفس المفتاح الموجود فـ `firebase-config.js`، جرّب الموقع، وبعدها فعّل **Enforce** على Firestore.
   فـ localhost يطلع debug token فـ console المتصفح، سجّلو فـ App Check → Manage debug tokens.
4. **الدخول للأدمن:** افتح `/admin.html` بحساب `111aez333@gmail.com` (لازم نفس الإيميل فـ `admin.js` و `firestore.rules`).
5. **Cloudinary:** فـ Settings → Upload → upload preset `Storedz`: حدّد الصيغ (jpg, png, webp)، حد الحجم، وفولدر ثابت.
6. **تنظيف قديم (يدوي):** احذف collection `driverKyc` وحقول `idCardUrl/selfieUrl` من `deliveryRequests`، وصور الهوية القديمة من Cloudinary.
