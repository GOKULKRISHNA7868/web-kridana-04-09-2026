import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { updateDoc } from "firebase/firestore";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Logout / signed-out: clear instantly without a loading white flash
      if (!firebaseUser) {
        setUser(null);
        setInstitute(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setUser(firebaseUser);

      try {
        // 1️⃣ Check TRAINER first
        const trainerSnap = await getDoc(
          doc(db, "InstituteTrainers", firebaseUser.uid),
        );

        if (trainerSnap.exists()) {
          const data = trainerSnap.data();

          // 🔴 If trainer marked deleted
          if (data.isDeleted) {
            const now = new Date();
            const deleteAfter = data.deleteAfter?.toDate();

            if (deleteAfter && now < deleteAfter) {
              // ✅ Logged in within 60 days → Restore account
              await updateDoc(doc(db, "InstituteTrainers", firebaseUser.uid), {
                isDeleted: false,
                deletedAt: null,
                deleteAfter: null,
              });

              setInstitute({
                role: "trainer",
                ...data,
                isDeleted: false,
              });

              setLoading(false);
              return;
            } else {
              // ❌ Logged in after 60 days
              alert("Your account has been permanently deleted.");
              await signOut(auth);
              setInstitute(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }

          // ✅ Normal trainer
          setInstitute({
            role: "trainer",
            ...data,
          });

          setLoading(false);
          return;
        }
        const trainerMainSnap = await getDoc(
          doc(db, "trainers", firebaseUser.uid),
        );

        if (trainerMainSnap.exists()) {
          const data = trainerMainSnap.data();

          if (data.isDeleted) {
            const now = new Date();
            const deleteAfter = data.deleteAfter?.toDate();

            if (deleteAfter && now < deleteAfter) {
              await updateDoc(doc(db, "trainers", firebaseUser.uid), {
                isDeleted: false,
                deletedAt: null,
                deleteAfter: null,
              });
            } else {
              alert("Your account has been permanently deleted.");
              await signOut(auth);
              setInstitute(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }
        // 2️⃣ Else check INSTITUTE
        const instituteSnap = await getDoc(
          doc(db, "institutes", firebaseUser.uid),
        );

        if (instituteSnap.exists()) {
          const data = instituteSnap.data();

          // 🔴 If account marked deleted
          if (data.isDeleted) {
            const now = new Date();
            const deleteAfter = data.deleteAfter?.toDate();

            if (deleteAfter && now < deleteAfter) {
              // ✅ Logged in within 60 days → Restore account
              await updateDoc(doc(db, "institutes", firebaseUser.uid), {
                isDeleted: false,
                deletedAt: null,
                deleteAfter: null,
              });

              setInstitute({
                role: "institute",
                ...data,
                isDeleted: false,
              });
            } else {
              // ❌ Logged in after 60 days
              alert("Your account has been permanently deleted.");
              await signOut(auth);
              setInstitute(null);
              setUser(null);
              setLoading(false);
              return;
            }
          } else {
            // ✅ Normal account
            setInstitute({
              role: "institute",
              ...data,
            });
          }
        } else {
          setInstitute(null);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        setInstitute(null);
      } finally {
        setLoading(false);
      }
    });

    // ✅ VERY IMPORTANT
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, institute, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
