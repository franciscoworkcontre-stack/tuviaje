/**
 * CSS-animated SVG icon replacements for lucide-react icons.
 * All animations use keyframes defined in globals.css.
 */

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SparklesIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      {/* Center star */}
      <path
        d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"
        fill="currentColor"
        style={{ animation: "sparkle-spin 2s ease-in-out infinite", transformOrigin: "12px 8px" }}
      />
      {/* Top-right small */}
      <path
        d="M19 3l0.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"
        fill="currentColor"
        style={{ animation: "sparkle-twinkle 1.5s ease-in-out infinite 0.3s", transformOrigin: "19px 6px" }}
      />
      {/* Bottom-left small */}
      <path
        d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75z"
        fill="currentColor"
        style={{ animation: "sparkle-twinkle 1.5s ease-in-out infinite 0.8s", transformOrigin: "5px 20px" }}
      />
    </svg>
  );
}

export function WandIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "wand-wave 1.8s ease-in-out infinite", transformOrigin: "6px 18px" }}>
      <path d="m15 4-8.5 8.5-1 3 3-1L17 6" />
      <path d="m17.5 2.5 1 1" style={{ animation: "sparkle-twinkle 1.2s ease-in-out infinite 0.1s" }} />
      <path d="m20 5 1 1" style={{ animation: "sparkle-twinkle 1.2s ease-in-out infinite 0.4s" }} />
      <path d="m20 2 1 1" style={{ animation: "sparkle-twinkle 1.2s ease-in-out infinite 0.7s" }} />
      <path d="m17 5-1-1" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "arrow-slide 1.4s ease-in-out infinite" }}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function MapPinIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "pin-pulse 2.5s ease-in-out infinite", transformOrigin: "12px 12px" }}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function LoaderIcon({ size = 16, className = "" }: IconProps) {
  const r = 9;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: `spinner-orbit 1s linear infinite` }}>
      <circle cx="12" cy="12" r={r} stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
      <circle
        cx="12" cy="12" r={r}
        stroke="currentColor" strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          strokeDashoffset: circumference * 0.7,
          transformOrigin: "12px 12px",
        }}
      />
    </svg>
  );
}

export function DownloadIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline
        points="7 10 12 15 17 10"
        style={{ animation: "download-bounce 1.6s ease-in-out infinite", transformOrigin: "12px 12px" }}
      />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function FileSpreadsheetIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" style={{ animation: "sparkle-twinkle 2s ease-in-out infinite 0s" }} />
      <path d="M8 17h2" style={{ animation: "sparkle-twinkle 2s ease-in-out infinite 0.3s" }} />
      <path d="M14 13h2" style={{ animation: "sparkle-twinkle 2s ease-in-out infinite 0.6s" }} />
      <path d="M14 17h2" style={{ animation: "sparkle-twinkle 2s ease-in-out infinite 0.9s" }} />
    </svg>
  );
}

export function PlaneIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "plane-fly 3s ease-in-out infinite" }}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l3.4 3.4L3 12l9 3z" />
    </svg>
  );
}

export function CalendarIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "calendar-flip 3s ease-in-out infinite", transformOrigin: "12px 12px" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function MinusIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function XIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUpIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline
        points="20 6 9 17 4 12"
        style={{ strokeDasharray: 20, animation: "check-draw 0.3s ease-out forwards" }}
      />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ThumbsUpIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

export function ThumbsDownIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

export function ClockIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function UsersIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function Edit2Icon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function BedDoubleIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle", animation: "float 3s ease-in-out infinite", transformOrigin: "12px 12px" }}>
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 10v4" />
      <path d="M2 18h20" />
    </svg>
  );
}

export function BusIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M8 6v6" />
      <path d="M15 6v6" />
      <path d="M2 12h19.6" />
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
      <circle cx="7" cy="18" r="2" />
      <path d="M9 18h5" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}

export function UtensilsCrossedIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2 22 3-3" />
    </svg>
  );
}

export function DollarSignIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function FileDownIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 18v-6" style={{ animation: "download-bounce 1.6s ease-in-out infinite" }} />
      <path d="m9 15 3 3 3-3" style={{ animation: "download-bounce 1.6s ease-in-out infinite" }} />
    </svg>
  );
}

export function MapIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

export function MenuIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
