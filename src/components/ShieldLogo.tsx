import { Shield } from "lucide-react";

const ShieldLogo = ({ className = "", size = 32 }: { className?: string; size?: number }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Shield className="text-primary" size={size} strokeWidth={2.5} fill="currentColor" />
    <span className="font-display font-bold text-xl tracking-tight">
      SIOTO<span className="text-primary">.AI</span>
    </span>
  </div>
);

export default ShieldLogo;
