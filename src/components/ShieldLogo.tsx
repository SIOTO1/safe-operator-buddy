import siotoLogo from "@/assets/sioto-logo.png";

const ShieldLogo = ({ className = "", size = 32 }: { className?: string; size?: number }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={siotoLogo}
      alt="SIOTO - Safe Inflatable Operators Training Organization"
      style={{ height: size * 1.2 }}
      className="object-contain"
    />
  </div>
);

export default ShieldLogo;
