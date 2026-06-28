import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import toast from "react-hot-toast";
import { STATES } from "../data/states";

export const AdminRegistration: React.FC = () => {
  const { registerAdmin } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim() || !sector || !password) {
      toast.error("Please fill out all fields.");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await registerAdmin(email.trim(), password, fullName.trim(), sector);
      navigate("/admin");
    } catch (err) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest min-h-screen text-on-surface font-display-sm flex justify-center w-full relative overflow-y-auto">
      <div className="w-full max-w-[480px] bg-surface-container-lowest min-h-screen relative flex flex-col shadow-sm border-x border-outline-variant/30">
        <header className="sticky top-0 z-10 bg-surface-container-lowest w-full flex justify-between items-center px-4 h-16 border-b border-outline-variant/50">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="text-primary p-2 hover:bg-surface-container-low transition-colors duration-150 rounded-full flex items-center justify-center -ml-2">
            <span className="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
          </button>
          <h1 className="font-semibold text-[22px] font-bold text-primary flex-1 text-center pr-8">Civic Clarity</h1>
        </header>

        <main className="flex-1 px-4 py-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center mb-4">
            <h2 className="font-semibold text-[28px] text-on-surface">Apply for Admin Access</h2>
            <p className="text-[16px] text-on-surface-variant max-w-[90%] mx-auto">
              Create an account to manage your sector's infrastructure reports.
            </p>
          </div>

          <form id="admin-registration-form" onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[12px] text-on-surface-variant ml-1" htmlFor="fullName">Full Name</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" data-icon="badge">badge</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] placeholder:text-outline/70" 
                  id="fullName" 
                  placeholder="Jane Doe" 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[12px] text-on-surface-variant ml-1" htmlFor="email">Official Email</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" data-icon="email">email</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] placeholder:text-outline/70" 
                  id="email" 
                  placeholder="jane.doe@gov.sector" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[12px] text-on-surface-variant ml-1" htmlFor="sector">Assigned Sector</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline z-10" data-icon="map">map</span>
                <select 
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] appearance-none cursor-pointer" 
                  id="sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option disabled value="">Select Sector</option>
                  {STATES.find(s => s.id === "delhi")?.sectors.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 text-outline pointer-events-none" data-icon="expand_more">expand_more</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[12px] text-on-surface-variant ml-1" htmlFor="password">Password</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" data-icon="lock">lock</span>
                <input 
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] placeholder:text-outline/70" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)} 
                  aria-label="Toggle password visibility" 
                  className="absolute right-3 text-outline hover:text-primary transition-colors focus:outline-none" 
                  type="button"
                >
                  <span className="material-symbols-outlined" data-icon="visibility">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[12px] text-on-surface-variant ml-1" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline" data-icon="lock">lock</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] placeholder:text-outline/70" 
                  id="confirmPassword" 
                  placeholder="••••••••" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <button type="submit" className="hidden" />
          </form>

          <div className="mt-auto pt-6 flex flex-col gap-2 pb-8">
            <button 
              disabled={loading}
              className="w-full bg-[#0E7C5A] text-on-primary font-semibold text-[18px] py-4 rounded-full flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0px_4px_12px_rgba(0,0,0,0.08)] disabled:opacity-70" 
              form="admin-registration-form" 
              type="submit"
            >
              {loading ? "Submitting..." : "Submit Admin Application"}
              {!loading && <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>}
            </button>
            <p className="text-[14px] text-on-surface-variant text-center px-4 mt-2">
              Admin accounts require verification before full access is granted.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};
