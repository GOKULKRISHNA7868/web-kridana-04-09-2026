import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyAJeWiaQaq2sRK8ouaG7lTU5we2FgY-TXs",
  authDomain: "kridana-975e1.firebaseapp.com",
  projectId: "kridana-975e1",
  storageBucket: "kridana-975e1.firebasestorage.app",
  messagingSenderId: "778934528785",
  appId: "1:778934528785:web:d35e1002f676e71d787ab0",
  measurementId: "G-6GJX89X0Q2",
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
