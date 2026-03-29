/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#060816",
        panel: "#0d1326",
        panelSoft: "#121a31",
        line: "#213154",
        text: "#e4ecff",
        muted: "#8ba0c7",
        hcpro: "#3be7b0",
        orchestrate: "#41b6ff",
        engage: "#b67dff",
        danger: "#ff5f78",
        amber: "#fbbf24",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(112, 139, 255, 0.16), 0 16px 60px rgba(16, 24, 48, 0.48)",
        neon: "0 0 40px rgba(59, 231, 176, 0.18)",
        portal: "0 0 0 1px rgba(122, 157, 255, 0.14), 0 28px 80px rgba(2, 8, 24, 0.65), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        ambient:
          "radial-gradient(circle at 20% 20%, rgba(65, 182, 255, 0.20), transparent 30%), radial-gradient(circle at 80% 0%, rgba(182, 125, 255, 0.16), transparent 26%), radial-gradient(circle at 50% 100%, rgba(59, 231, 176, 0.14), transparent 30%)",
        cinematic:
          "linear-gradient(135deg, rgba(0,176,255,0.14), transparent 28%), radial-gradient(circle at 18% 18%, rgba(0,176,255,0.18), transparent 22%), radial-gradient(circle at 78% 14%, rgba(182,125,255,0.18), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'Manrope'", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(140%)" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseGlow: "pulseGlow 5s ease-in-out infinite",
        scan: "scan 7s linear infinite",
      },
    },
  },
  plugins: [],
};
