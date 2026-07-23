import { useEffect, useRef, useState, type ReactNode } from "react";
import { explainEffect, type EffectInfo } from "../game/effectInfo";
import type { Creature } from "../engine";

// color por efecto (sabor visual)
export const EFFECT_COLOR: Record<string, string> = {
  sangrado: "#c0453a", bleeding: "#c0453a",
  dolor: "#b06fe3", pain: "#b06fe3",
  aturdido: "#c9a24a", stunned: "#c9a24a",
  quema: "#d67c3a", burning: "#d67c3a",
};

/**
 * Tooltip genérico reusable: envuelve cualquier "trigger" (children) y, al tocarlo,
 * muestra un popover con la explicación (info). Usado por chips de arma y pills de combate.
 */
export function EffectTooltip({ info, color = "var(--accent)", children }: { info: EffectInfo | null; color?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!info) return <>{children}</>;
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ cursor: "pointer" }}>{children}</span>
      {open && (
        <span role="tooltip" onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
            width: 236, maxWidth: "70vw", background: "var(--panel, #1e1a14)", border: "1px solid var(--line, #3a3227)",
            borderRadius: 10, padding: "10px 12px", boxShadow: "0 12px 30px rgba(0,0,0,.55)", zIndex: 200, textAlign: "left", cursor: "default" }}>
          <b style={{ display: "block", color, fontSize: 13, marginBottom: 4 }}>{info.title}</b>
          <span style={{ display: "block", color: "var(--ink, #e8e0d2)", fontSize: 12.5, lineHeight: 1.5 }}>{info.body}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Chip tocable del efecto de un ARMA (fuera de combate → mecánica; con target → números).
 */
export function EffectChip({ abilityId, user, target }: { abilityId: string; user: Creature; target?: Creature }) {
  const info = explainEffect(abilityId, user, target);
  if (!info) return null;
  const color = EFFECT_COLOR[info.label] ?? "var(--accent)";
  return (
    <EffectTooltip info={info} color={color}>
      <span style={{ display: "inline-block", border: `1px solid ${color}`, color, borderRadius: 999,
        padding: "1px 9px", fontSize: 11.5, fontWeight: 600, letterSpacing: ".02em", lineHeight: 1.6, whiteSpace: "nowrap" }}>
        {info.label} ⓘ
      </span>
    </EffectTooltip>
  );
}
