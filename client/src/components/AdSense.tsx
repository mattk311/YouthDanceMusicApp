import { useEffect, useRef } from "react";

interface AdSenseProps {
  client?: string;
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "";
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  layoutKey?: string;
}

export default function AdSense({
  client = import.meta.env.VITE_ADSENSE_CLIENT || "",
  slot = "",
  format = "auto",
  responsive = true,
  style = { display: "block" },
  className = "",
  layoutKey,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !slot) {
      console.warn("AdSense client or slot ID not configured. Set VITE_ADSENSE_CLIENT in your environment.");
      return;
    }

    const loadAd = () => {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle && adsbygoogle.loaded !== true) {
          adsbygoogle.push({});
        }
      } catch (error) {
        console.error("AdSense error:", error);
      }
    };

    const checkAndLoadAd = () => {
      if ((window as any).adsbygoogle) {
        loadAd();
      } else {
        setTimeout(checkAndLoadAd, 300);
      }
    };

    checkAndLoadAd();
  }, [client, slot]);

  if (!client || !slot) {
    return null;
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
      data-ad-layout-key={layoutKey}
    />
  );
}
