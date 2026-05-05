import { BRAND_COLORS } from "../../constants/theme";

interface BrandSignatureProps {
  language: string;
  signatureText?: string;
  className?: string;
  color?: string;
  size?: 'sm' | 'lg' | 'auto';
  wow?: boolean;
}

export const BrandSignature = ({
  language,
  signatureText,
  className = "",
  color = BRAND_COLORS.ACCENT_CYAN,
  size = 'auto',
  wow = true,
}: BrandSignatureProps) => {
  const isEn = language === "en";

  const baseStyles: React.CSSProperties = {
    color,
    display: "flex",
    alignItems: "center",
    gap: size === 'lg' ? 6 : 2,
    fontWeight: 900,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    letterSpacing: "0.05em",
    textShadow: "0 1px 3px rgba(0,0,0,0.2)",
  };

  const isWow = wow;

  const wowStyles: React.CSSProperties = {
    ...baseStyles,
    color: isWow ? "transparent" : color,
    backgroundImage: isWow
      ? `linear-gradient(90deg, #F6DE37, #fef08a, #ffffff, #fef08a, #F6DE37)`
      : "none",
    WebkitBackgroundClip: isWow ? "text" : "none",
    backgroundClip: isWow ? "text" : "none",
    // filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
  };

  const finalClassName = `${className} ${isWow ? 'animate-text-shimmer' : ''}`.trim();

  if (!isEn) {
    return (
      <span className={finalClassName} style={{ ...wowStyles, fontSize: size === 'lg' ? 10 : 8.5 }}>
        {signatureText}
      </span>
    );
  }

  return (
    <div className={finalClassName} style={{ ...wowStyles, fontSize: size === 'lg' ? 10 : 8 }}>
      <span>SIGNATURE</span>
      <span style={{
        fontFamily: "'Apple Garamond', Georgia, serif",
        fontStyle: "italic",
        fontSize: size === 'lg' ? 11 : 10,
        fontWeight: "normal",
        textTransform: "none",
        opacity: 0.9,
        margin: "0 2px"
      }}>
        of
      </span>
      <span>QUALITY</span>
    </div>
  );
};
