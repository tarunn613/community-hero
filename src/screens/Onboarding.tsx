import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";

export const Onboarding: React.FC = () => {
  const { user, isGuest, userProfile, loginWithGoogle, loginWithUserId, continueAsGuest } = useApp();
  const navigate = useNavigate();

  const [userIdInput, setUserIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      if (!userProfile.userId) {
        navigate("/setup-account");
      } else {
        navigate(userProfile.sectorId ? "/home" : "/sectors");
      }
    } else if (isGuest) {
      navigate(localStorage.getItem("guest_sector") ? "/home" : "/sectors");
    }
  }, [user, userProfile, isGuest, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdInput.trim() || !passwordInput) return;
    setLoading(true);
    try {
      await loginWithUserId(userIdInput.trim(), passwordInput);
    } catch (err) {
      // Error handled in context with toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-[100dvh] flex flex-col justify-center px-4 py-6 w-full antialiased mx-auto relative overflow-y-auto">
      <div className="flex flex-col items-center mb-6 w-full">
          <div className="w-20 h-20 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container mb-1 shadow-sm overflow-hidden">
            <img src="/icon.svg" alt="App Logo" className="w-full h-full object-cover" />
          </div>
        <h1 className="font-semibold text-[22px] text-primary mb-1 text-center tracking-tight">Civic Clarity</h1>
        <p className="text-[14px] text-secondary text-center px-4">Sign in to report and track civic issues.</p>
      </div>

      <form onSubmit={handleSignIn} className="flex flex-col w-full mb-6 gap-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-secondary">person</span>
          </div>
          <input 
            className="block w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-primary focus:ring-1 focus:ring-primary focus:border-primary text-[16px]" 
            id="userid" 
            placeholder="User ID" 
            type="text"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
          />
        </div>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-secondary">lock</span>
          </div>
          <input 
            className="block w-full pl-10 pr-10 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-primary focus:ring-1 focus:ring-primary focus:border-primary text-[16px]" 
            id="password" 
            placeholder="Password" 
            type={showPassword ? "text" : "password"}
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors duration-150"
          >
            <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
          </button>
        </div>

        <div className="flex justify-between w-full mt-1">
          <button type="button" onClick={continueAsGuest} className="font-semibold text-[12px] text-on-surface-variant hover:underline transition-all duration-150 ease-out">
            Continue as guest
          </button>
          <a className="font-semibold text-[12px] text-primary hover:underline transition-all duration-150 ease-out" href="#">Forgot password?</a>
        </div>

        <button 
          type="submit"
          disabled={loading || !userIdInput.trim() || !passwordInput}
          className="w-full bg-primary-container text-on-primary font-semibold text-[18px] py-3 rounded-full flex items-center justify-center gap-2 mt-2 hover:bg-primary transition-colors duration-150 ease-out shadow-[0px_4px_12px_rgba(0,0,0,0.08)] active:scale-95 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative flex py-4 items-center w-full mb-6">
        <div className="flex-grow border-t border-outline-variant"></div>
        <span className="flex-shrink-0 mx-4 text-[14px] text-on-surface-variant">or</span>
        <div className="flex-grow border-t border-outline-variant"></div>
      </div>

      <div className="w-full flex flex-col gap-4">
        <button 
          onClick={loginWithGoogle}
          type="button"
          className="w-full border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold text-[18px] py-3 rounded-full flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors duration-150 ease-out active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-auto pt-6 text-center w-full flex flex-col gap-3">
        <p className="text-[14px] text-on-surface-variant">
          Don't have an account? <button onClick={loginWithGoogle} className="text-primary hover:underline font-semibold transition-all duration-150 ease-out">Sign up</button>
        </p>
        <button 
          onClick={() => navigate("/admin/login")} 
          className="text-[12px] text-on-surface-variant/70 hover:text-primary transition-colors font-medium"
        >
          Admin Portal
        </button>
      </div>
    </div>
  );
};
