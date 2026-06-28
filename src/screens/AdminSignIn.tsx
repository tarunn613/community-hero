import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import toast from "react-hot-toast";

export const AdminSignIn: React.FC = () => {
  const { loginAdmin } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    
    setLoading(true);
    try {
      await loginAdmin(email.trim(), password);
      navigate("/admin");
    } catch (err) {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center p-4 font-body-lg w-full">
      <div className="w-full max-w-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-6 shadow-sm">
        <header className="flex flex-col items-center text-center gap-2">
          <div className="w-20 h-20 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container mb-1 shadow-sm overflow-hidden">
            <img src="/icon.svg" alt="App Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-semibold text-[22px] text-primary">Civic Clarity Admin Portal</h1>
          <p className="text-[14px] text-on-surface-variant">Sign in to manage and resolve civic issues.</p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined">person</span>
            </div>
            <input 
              className="block w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg bg-surface focus:ring-primary focus:border-primary text-[16px] text-on-surface placeholder-on-surface-variant/70 transition-colors duration-150 ease-out" 
              id="admin_id" 
              name="admin_id" 
              placeholder="Admin Email" 
              required 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <input 
              className="block w-full pl-10 pr-10 py-3 border border-outline-variant rounded-lg bg-surface focus:ring-primary focus:border-primary text-[16px] text-on-surface placeholder-on-surface-variant/70 transition-colors duration-150 ease-out" 
              id="password" 
              name="password" 
              placeholder="Password" 
              required 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors duration-150 ease-out" 
              onClick={() => setShowPassword(!showPassword)} 
              type="button"
            >
              <span className="material-symbols-outlined" id="visibility_icon">{showPassword ? "visibility_off" : "visibility"}</span>
            </button>
          </div>

          <div className="flex justify-end mt-1">
            <button type="button" className="font-semibold text-[12px] text-secondary hover:text-primary transition-colors duration-150 ease-out">
              Forgot password?
            </button>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-semibold text-[18px] py-3 rounded-full flex justify-center items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-150 ease-out shadow-[0px_4px_12px_rgba(0,0,0,0.08)] mt-2 min-h-[48px] disabled:opacity-70" 
            type="submit"
          >
            <span>{loading ? "Signing in..." : "Sign in to Admin Console"}</span>
            {!loading && <span className="material-symbols-outlined text-[20px]">login</span>}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-4 border-t border-outline-variant">
          <button onClick={() => navigate("/admin/register")} className="text-[14px] text-secondary hover:text-primary transition-colors duration-150 ease-out font-medium">
            Register as new admin
          </button>
          <button onClick={() => navigate("/")} className="text-[14px] text-on-surface-variant hover:text-primary transition-colors duration-150 ease-out font-medium">
            Return to citizen portal
          </button>
        </div>
      </div>
    </div>
  );
};
