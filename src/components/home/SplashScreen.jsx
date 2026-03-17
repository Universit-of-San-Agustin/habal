import { useEffect, useState } from "react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const DINAGYANG_MASCOT = "https://media.base44.com/images/public/69a8713560c1bb2be40e7e5e/e3b6b8b71_giphy1.png";

export default function SplashScreen() {
  const [phase, setPhase] = useState("in"); // in | show | out
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 200);
    const t2 = setTimeout(() => setPhase("out"), 2600);
    const t3 = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #F5F5F7 0%, #FAFAFA 50%, #F0F0F5 100%)",
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes mascotEnter {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.85);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes floatBreath {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-12px) scale(1.05);
          }
        }
        @keyframes featherGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }
        @keyframes textFade {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes dotFloat {
          0%, 100% {
            transform: translateY(0) scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-6px) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Decorative animated glow circles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, rgba(255, 200, 87, ${0.1 - i * 0.03}) 0%, transparent 70%)`,
              animation: `featherGlow ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        className="flex flex-col items-center gap-6 z-10 px-6"
        style={{
          animation: phase === "show" ? "mascotEnter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : undefined,
          opacity: phase === "in" ? 0 : 1,
        }}
      >
        {/* Dinagyang Mascot */}
        <div className="relative">
          {/* Subtle shadow */}
          <div
            className="absolute inset-0 blur-2xl opacity-20 rounded-full"
            style={{
              background: "radial-gradient(circle, #FFC857 0%, transparent 70%)",
              transform: "translateY(20px) scale(0.8)",
            }}
          />
          
          {/* Mascot image with float+breath animation */}
          <img
            src={DINAGYANG_MASCOT}
            alt="Dinagyang Mascot"
            className="relative w-56 h-56 sm:w-64 sm:h-64 object-contain"
            style={{
              animation: phase === "show" ? "floatBreath 3s ease-in-out infinite" : undefined,
              filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.15))",
            }}
          />
        </div>

        {/* Brand text */}
        <div
          className="flex flex-col items-center gap-2"
          style={{
            animation: phase === "show" ? "textFade 0.8s ease-out 0.3s forwards" : undefined,
            opacity: phase === "in" ? 0 : 1,
          }}
        >
          <h1
            className="text-5xl sm:text-6xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #1C1C1E 0%, #48484A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            }}
          >
            HABAL
          </h1>
          <p
            className="text-base sm:text-lg font-semibold tracking-wide"
            style={{
              color: "#8E8E93",
              letterSpacing: "0.05em",
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            }}
          >
            Iloilo Rider Network
          </p>
        </div>

        {/* Loading indicator dots */}
        <div
          className="flex items-center gap-2 mt-2"
          style={{
            animation: phase === "show" ? "textFade 0.8s ease-out 0.5s forwards" : undefined,
            opacity: phase === "in" ? 0 : 1,
          }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#007AFF",
                  animation: phase === "show" ? `dotFloat 1.2s ease-in-out ${i * 0.2}s infinite` : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom accent gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(255, 200, 87, 0.08) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}