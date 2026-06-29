import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db, auth } from "../AppContext";
import toast from "react-hot-toast";

export const SetupAccount: React.FC = () => {
  const { user, userProfile, fetchUserProfile, signOut } = useApp();
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate Password Security
  const isPasswordValid = (pw: string) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    return pw.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!isPasswordValid(password)) {
      toast.error("Password must be at least 8 chars long, include uppercase, lowercase, number, and special character.");
      return;
    }

    if (!userId.trim() || userId.length < 3) {
      toast.error("User ID must be at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const lowerUserId = userId.toLowerCase().trim();
      
      // Check if User ID exists
      const usernameDocRef = doc(db, "usernames", lowerUserId);
      const usernameDocSnap = await getDoc(usernameDocRef);
      if (usernameDocSnap.exists() && usernameDocSnap.data().uid !== user.uid) {
        toast.error("User ID already exists. Please choose another.");
        setLoading(false);
        return;
      }

      // Update Firebase Auth Password
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, password);
      }

      // Claim User ID in usernames collection
      await setDoc(usernameDocRef, {
        uid: user.uid,
        email: user.email
      });

      // Update UserProfile
      await updateDoc(doc(db, "users", user.uid), {
        userId: lowerUserId
      });
      
      await fetchUserProfile(user.uid);
      
      toast.success("Account set up successfully!");
      navigate(userProfile?.sectorId ? "/home" : "/sectors");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Please sign out and sign in again before setting a password.");
      } else {
        toast.error(err.message || "Failed to set up account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(userProfile?.sectorId ? "/home" : "/sectors");
  };

  return (
    <div className="w-full max-w-[480px] min-h-screen flex flex-col bg-surface-container-lowest border-x border-outline-variant relative shadow-sm mx-auto">
      <header className="flex items-center justify-between px-4 h-16 w-full sticky top-0 bg-surface-container-lowest z-10">
        <button 
          onClick={async () => {
            await signOut();
            navigate("/");
          }} 
          aria-label="Go back" 
          className="text-on-surface-variant hover:bg-surface-container-low transition-colors duration-150 p-2 rounded-full -ml-2"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
        </button>
        <h1 className="font-semibold text-[18px] text-on-surface absolute left-1/2 -translate-x-1/2">Set up account</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {user && (
            <div className="flex items-center gap-2 p-3 bg-surface-container-low border border-outline-variant rounded-lg self-start">
              <div className="relative w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center font-semibold text-[12px] text-on-secondary-container shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-surface-container-lowest">
                  <span className="material-symbols-outlined text-[10px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[12px] text-on-surface-variant">Signed in with Google</span>
                <span className="text-[14px] text-on-surface">{user.email}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <h2 className="font-semibold text-[28px] text-on-surface tracking-tight">Set up your account</h2>
            <p className="text-[16px] text-on-surface-variant">You're signed in with Google. Create a user ID and password to also sign in directly.</p>
          </div>
        </div>

        <form onSubmit={handleCreateAccount} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[12px] text-on-surface" htmlFor="userId">User ID</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none">badge</span>
              <input 
                className="w-full h-12 pl-10 pr-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-[16px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline" 
                id="userId" 
                placeholder="Enter a public user id" 
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <p className="text-[14px] text-on-surface-variant mt-1">This is your public identifier.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[12px] text-on-surface" htmlFor="password">Password</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none">lock</span>
              <input 
                className="w-full h-12 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-[16px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline" 
                id="password" 
                placeholder="Create a password" 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            <p className="text-[14px] text-on-surface-variant mt-1">At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[12px] text-on-surface" htmlFor="confirmPassword">Confirm Password</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none">lock</span>
              <input 
                className="w-full h-12 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-[16px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline" 
                id="confirmPassword" 
                placeholder="Re-enter password" 
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          
          <button type="submit" className="hidden" />
        </form>

        <div className="flex-1"></div>

        <div className="flex flex-col gap-4 pt-6 pb-4 mt-auto">
          <button 
            onClick={handleCreateAccount}
            disabled={loading}
            className="w-full h-12 bg-primary-container text-on-primary rounded-full font-semibold text-[18px] flex items-center justify-center shadow-[0px_4px_12px_rgba(0,0,0,0.08)] hover:bg-primary transition-colors duration-150 active:scale-95 disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
          <button 
            onClick={handleSkip}
            className="w-full h-12 text-outline font-semibold text-[18px] flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors duration-150 active:scale-95"
          >
            Skip for now
          </button>
        </div>
      </main>
    </div>
  );
};
