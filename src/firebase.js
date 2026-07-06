import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyDlmh88tHoBWtZL1Y69sRtgp-cnW-xglEs",
  authDomain: "testing-kridana.firebaseapp.com",
  projectId: "testing-kridana",
  storageBucket: "testing-kridana.firebasestorage.app",
  messagingSenderId: "778865160582",
  appId: "1:778865160582:web:bdbd05366d1474b717fc07",
  measurementId: "G-TWJ54WX0HN",
};

const app = initializeApp(firebaseConfig);
let analytics = null;

isSupported().then((yes) => {
  if (yes) {
    analytics = getAnalytics(app);
  }
});

export { analytics };
export const auth = getAuth(app);

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const db = getFirestore(app);
export const storage = getStorage(app);
