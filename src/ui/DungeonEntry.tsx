import { useEffect, useRef, useState } from "react";
import { t } from "../game/i18n";

/** Transición genérica de entrada a mazmorra. Lee nombre + descripción (data-driven):
 *  funciona para cualquier mazmorra, incluidas futuras del administrador. Breve y saltable. */
export function DungeonEntry({ name, desc, floor, onDone }: {
  name: string; desc: string; floor: number; onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; setLeaving(true); setTimeout(onDone, 260); };

  useEffect(() => {
    const spark = setTimeout(() => {}, 0);
    const timer = setTimeout(finish, 2000);   // se cierra sola ~2s
    return () => { clearTimeout(timer); clearTimeout(spark); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={"dgentry" + (leaving ? " leaving" : "")} onClick={finish}>
      <svg className="dgentry-portal" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 58 L14 26 A18 18 0 0 1 50 26 L50 58" />
        <line x1="8" y1="58" x2="56" y2="58" />
        <path d="M32 20 L32 40 M24 32 L32 40 L40 32" />
      </svg>
      <div className="dgentry-title">{name}</div>
      <div className="dgentry-desc">{desc}</div>
      {floor > 1 && <div className="dgentry-floor">{t("select.startFloor")} · {t("select.floor", { n: floor })}</div>}
    </div>
  );
}
