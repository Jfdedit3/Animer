import { Link, useLocation } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import { Fox } from "@/components/brand/NartyaMark";
import { useAuthStore } from "@/stores/useAuthStore";
export default function YoruHeader() {
  const { pathname } = useLocation();
  const session = useAuthStore((s) => s.session);
  if (!["/", "/search", "/planning", "/login"].includes(pathname)) return null;
  return (
    <header className="yoru-header">
      <Link to="/" className="yoru-brand" aria-label="Animer, accueil"><Fox className="h-9 w-9 text-primary" /><span>animer<span className="text-primary">.</span></span></Link>
      <div className="yoru-header-actions">
        <Link to="/search" aria-label="Rechercher un anime"><Search size={20} /></Link>
        <Link to={session ? "/profile" : "/login"} aria-label="Mon compte Nartya"><UserRound size={20} /></Link>
      </div>
    </header>
  );
}
