import logoAsset from "../../assets/vexia-logo-app.png.asset.json";

export function VexiaLogo({ className = "h-14" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="VÉXIA TV"
      className={`${className} w-auto select-none object-contain`}
      style={{ filter: "drop-shadow(0 0 16px color-mix(in oklab, var(--vexia-purple) 60%, transparent))" }}
      draggable={false}
    />
  );
}
