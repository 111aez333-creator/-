export const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyAE6bFNg2UoTuX_3fpg-6qGIYptrPjomvI",
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "my-creative-gallery.firebaseapp.com",
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "my-creative-gallery",
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "747786841776",
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:747786841776:web:1c24ebf88b404a85b59575",
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-2CM6BJJ53K"
};

export const IMGBB_API_KEY = import.meta.env?.VITE_IMGBB_API_KEY || "2b3d2c06ed007ca38badaa8f97614954";
export const ADMIN_UID = import.meta.env?.VITE_ADMIN_UID || "YOUR_REAL_ADMIN_AUTH_UID_HERE";

export const PAGE_SIZE = 12;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS = 10;
export const MAX_BIO_LENGTH = 300;
export const MAX_NAME_LENGTH = 50;
