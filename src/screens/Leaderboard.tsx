import React, { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../AppContext";

export const Leaderboard: React.FC = () => {
  const { user, userProfile } = useApp();
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(100)));
        let list: any[] = [];
        snap.forEach((d) => list.push(d.data()));

        list.sort((a, b) => ((b.resolvedCount||0)*2+(b.reportsCount||0)) - ((a.resolvedCount||0)*2+(a.reportsCount||0)));
        setUsers(list);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const myRank = users.findIndex((u) => u.uid === userProfile?.uid) + 1;

  function name_(u: any) {
    return (u.displayName && u.displayName !== "Civic Guardian") ? u.displayName : "Civic Guardian";
  }
  function avatar(u: any, fallback: string) {
    if (u.photoURL) return u.photoURL;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallback)}&background=e9edff&color=006145&length=2`;
  }
  function score(u: any) { return (u.resolvedCount||0)*20 + (u.reportsCount||0)*10; }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant flex items-center gap-3 px-4 h-14">
        <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
        <h1 className="font-bold text-[15px] text-on-surface">Leaderboard</h1>
      </header>

      <main className="px-4 pt-4 space-y-3 pb-4">
        {/* My card */}
        {userProfile && (
          <div className="cc-card p-4 flex items-center gap-3 border-l-4 border-l-primary">
            <img
              src={avatar(userProfile, name_(userProfile))}
              alt="Me"
              className="w-12 h-12 rounded-full object-cover border border-outline-variant shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold text-on-surface truncate">{name_(userProfile)}</p>
                {myRank > 0 && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">#{myRank}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-on-surface-variant">
                <span>{userProfile.reportsCount||0} reports</span>
                <span>{userProfile.resolvedCount||0} resolved</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[18px] font-bold text-primary">{score(userProfile).toLocaleString()}</p>
              <p className="text-[9px] uppercase tracking-wider text-outline font-semibold">XP</p>
            </div>
          </div>
        )}

        {/* Section title */}
        <p className="text-[10px] uppercase tracking-wider font-bold text-outline pt-1">Top contributors</p>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map((n) => <div key={n} className="h-16 shimmer-skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u, idx) => {
              const rank  = idx + 1;
              const isMe  = u.uid === userProfile?.uid;
              const n     = name_(u);
              return (
                <div
                  key={u.uid || idx}
                  className={`cc-card flex items-center gap-3 p-3 ${isMe ? "border-l-4 border-l-primary" : ""}`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    rank === 1 ? "bg-amber-400 text-white" :
                    rank === 2 ? "bg-gray-300 text-gray-800" :
                    rank === 3 ? "bg-amber-700 text-white" :
                    "bg-surface-container text-on-surface-variant"
                  }`}>
                    {rank <= 3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : rank}
                  </div>
                  {/* Avatar */}
                  <img src={avatar(u, n)} alt={n} className="w-10 h-10 rounded-full object-cover border border-outline-variant shrink-0" referrerPolicy="no-referrer" />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface truncate">{n}</p>
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                      <span>{u.reportsCount||0} reported</span>
                      <span className="text-primary font-semibold">{u.resolvedCount||0} resolved</span>
                    </div>
                  </div>
                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className={`text-[14px] font-bold ${isMe ? "text-primary" : "text-on-surface"}`}>{score(u).toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-wider text-outline font-semibold">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
