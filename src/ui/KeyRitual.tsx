import { useEffect, useRef } from "react";
import { t } from "../game/i18n";

/** Ritual luminoso: encontraste una llave de profundidad (hallazgo raro). */
export function KeyRitual({ dungeon, floor, onDone }: {
  dungeon: string; floor: number; onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; root.current?.classList.add("leaving"); setTimeout(onDone, 280); };

  useEffect(() => {
    // chispas doradas al aparecer la llave
    const host = root.current;
    if (host) {
      for (let i = 0; i < 14; i++) {
        const s = document.createElement("div");
        s.className = "kr-spark"; host.appendChild(s);
        const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 90;
        s.animate(
          [{ opacity: 0, transform: "translate(0,0) scale(1)" }, { opacity: 1, offset: .2 },
           { opacity: 0, transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist - 20}px) scale(0)` }],
          { duration: 800 + Math.random() * 500, delay: 700 + Math.random() * 200, easing: "cubic-bezier(.2,.7,.3,1)" }
        );
      }
    }
    return () => {};
  }, []);

  return (
    <div className="key-ritual" ref={root} onClick={finish}>
      <div className="kr-rays" />
      <div className="kr-stage">
        <svg className="kr-key" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="22" cy="22" r="11" /><circle cx="22" cy="22" r="3.5" />
          <path d="M30 30 L50 50" /><path d="M44 44 L50 38 M50 50 L56 44" />
        </svg>
        <div className="kr-kicker">{t("key.rare")}</div>
        <div className="kr-headline">🗝️ {t("dungeon.keyFound")}</div>
        <div className="kr-body">{t("key.body", { dungeon, floor })}</div>
        <button className="kr-go" onClick={finish}>{t("key.save")}</button>
      </div>
    </div>
  );
}
