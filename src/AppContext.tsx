import React, { createContext, useContext, useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { UserProfile, LocationCoordinates, AnalysisResult } from "./types";
import toast from "react-hot-toast";

// Initialize Firebase client on the web
import { getRedirectResult } from "firebase/auth";
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

interface AppContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isGuest: boolean;
  theme: "dark" | "light";
  toggleTheme: () => void;
  capturedImage: string; // base64
  setCapturedImage: (img: string) => void;
  capturedLocation: LocationCoordinates | null;
  setCapturedLocation: (loc: LocationCoordinates | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithUserId: (userId: string, pass: string) => Promise<void>;
  registerAdmin: (email: string, pass: string, name: string, sectorId: string) => Promise<void>;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  continueAsGuest: () => void;
  continueAsTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  clearCapture: () => void;
  loading: boolean;
  fetchUserProfile: (uid: string) => Promise<void>;
  updateProfilePicture: (base64: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem("is_guest") === "true";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return (saved as "dark" | "light") || "dark";
  });

  // Capture State
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [capturedLocation, setCapturedLocation] = useState<LocationCoordinates | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Apply Theme class on mount & changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      const root = window.document.documentElement;
      if (next === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
      return next;
    });
  };

  const fetchUserProfile = async (uid: string, currentUser?: User | null) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const profileData = userSnap.data() as UserProfile;
        setUserProfile(profileData);
      } else {
        const activeUser = currentUser || auth.currentUser || user;
        // Create initial profile if it doesn't exist
        const initialProfile: UserProfile = {
          uid,
          displayName: activeUser?.displayName || "Civic Guardian",
          email: activeUser?.email || null,
          photoURL: activeUser?.photoURL || null,
          joinedAt: new Date(),
          reportsCount: uid === "test-user-123" ? 3 : 0,
          resolvedCount: uid === "test-user-123" ? 1 : 0,
          level: 1,
          role: "citizen"
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        localStorage.removeItem("is_guest");
        await fetchUserProfile(currentUser.uid, currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handle redirect result
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const loggedUser = result.user;
          toast.success(`Welcome, ${loggedUser.displayName || "Hero"}!`);
        }
      } catch (err: any) {
        console.error("Redirect auth error:", err);
        toast.error(`Auth Error: ${err.message}`);
      }
    };
    handleRedirect();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Use custom parameters to force account selection if needed
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      toast.success(`Welcome, ${loggedUser.displayName || "Hero"}!`);
    } catch (err: any) {
      console.error("Auth error details:", err);
      
      // If popup is blocked or unsupported (like on mobile HTTP), try redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/unsupported-browser') {
        toast.error("Popup blocked. Attempting redirect...");
        // Fallback to redirect
        import("firebase/auth").then(({ signInWithRedirect }) => {
          signInWithRedirect(auth, provider).catch((redirectErr) => {
            console.error("Redirect failed:", redirectErr);
            toast.error(`Redirect Auth Error: ${redirectErr.message}`);
          });
        });
        return;
      }

      // If it's a cross-origin isolation or insecure context issue, try redirect
      toast.error("Popup failed, attempting redirect...");
      import("firebase/auth").then(({ signInWithRedirect }) => {
        signInWithRedirect(auth, provider).catch((redirectErr) => {
          console.error("Redirect failed:", redirectErr);
          toast.error(`Auth Error: ${err.message || "Failed to sign in"}`);
        });
      });
    }
  };

  const loginWithUserId = async (userId: string, pass: string) => {
    try {
      const docRef = doc(db, "usernames", userId.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("User ID not found.");
      }
      const email = docSnap.data().email;
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success(`Welcome back!`);
    } catch (err: any) {
      console.error("User ID login error:", err);
      toast.error(err.message || "Login failed. Check your User ID and Password.");
      throw err;
    }
  };

  const registerAdmin = async (email: string, pass: string, name: string, sectorId: string) => {
    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const newUid = result.user.uid;
      
      const adminProfile: UserProfile = {
        uid: newUid,
        displayName: name,
        email: email,
        photoURL: null,
        joinedAt: new Date(),
        reportsCount: 0,
        resolvedCount: 0,
        level: 1,
        role: "sector_admin",
        sectorId: sectorId
      };
      
      await setDoc(doc(db, "users", newUid), adminProfile);
      setUserProfile(adminProfile);
      toast.success("Admin account created successfully.");
    } catch (err: any) {
      console.error("Admin registration error:", err);
      toast.error(err.message || "Registration failed.");
      throw err;
    }
  };

  const loginAdmin = async (email: string, pass: string) => {
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const result = await signInWithEmailAndPassword(auth, email, pass);
      
      // Fetch profile to verify role
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const profileData = userSnap.data() as UserProfile;
        if (profileData.role !== "sector_admin" && profileData.role !== "super_admin") {
          await firebaseSignOut(auth);
          throw new Error("This account does not have admin privileges.");
        }
      } else {
        await firebaseSignOut(auth);
        throw new Error("User profile not found.");
      }
      
      toast.success("Admin login successful.");
    } catch (err: any) {
      console.error("Admin login error:", err);
      toast.error(err.message || "Login failed.");
      throw err;
    }
  };

  const continueAsTestUser = async () => {
    if (import.meta.env.PROD) {
      toast.error("Test user login is disabled in production environments.");
      return;
    }
    const mockUid = "test-user-123";
    const testProfile: UserProfile = {
      uid: mockUid,
      displayName: "Test Hero",
      email: "test@civic.in",
      photoURL: "https://ui-avatars.com/api/?name=Test+Hero&background=00C896&color=fff",
      joinedAt: new Date(),
      reportsCount: 3,
      resolvedCount: 1,
      level: 3
    };

    try {
      const userRef = doc(db, "users", mockUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, testProfile);
      }
    } catch (err) {
      console.warn("Could not sync mock user to Firestore (offline/permissions), proceeding locally.");
    }
    
    setUserProfile(testProfile);
    setIsGuest(false);
    // Place a dummy FirebaseUser-like object
    setUser({
      uid: mockUid,
      displayName: "Test Hero",
      email: "test@civic.in",
      photoURL: testProfile.photoURL,
      getIdToken: async () => "mock-token-abc"
    } as any);
    // Enrich from Firestore so persisted fields (role, sectorId) load too.
    await fetchUserProfile(mockUid);
    toast.success("Logged in as Test User (Offline Mode)");
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem("is_guest", "true");
    toast.success("Signed in as Guest");
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Sign out err:", e);
    }
    setUser(null);
    setUserProfile(null);
    setIsGuest(false);
    localStorage.removeItem("is_guest");
    toast.success("Signed out successfully");
  };

  const clearCapture = () => {
    setCapturedImage("");
    setCapturedLocation(null);
    setAnalysisResult(null);
  };

  const updateProfilePicture = async (base64: string) => {
    if (!user || !userProfile) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: base64 });
      setUserProfile({ ...userProfile, photoURL: base64 });
      toast.success("Profile picture updated!");
    } catch (err: any) {
      console.error("Profile picture update error:", err);
      toast.error("Failed to update profile picture.");
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        isGuest,
        theme,
        toggleTheme,
        capturedImage,
        setCapturedImage,
        capturedLocation,
        setCapturedLocation,
        analysisResult,
        setAnalysisResult,
        loginWithGoogle,
        loginWithUserId,
        registerAdmin,
        loginAdmin,
        continueAsGuest,
        continueAsTestUser,
        signOut,
        clearCapture,
        loading,
        fetchUserProfile,
        updateProfilePicture
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
