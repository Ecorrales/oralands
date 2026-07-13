import { useState } from "react";
import type { Creature } from "../engine";
import { getAbility } from "../engine";
import { RECIPES, canForge, type Recipe } from "../game/forge";
import { STAT_ES } from "../game/catalog";
import { matName, matIcon, type Mats } from "../game/materials";

const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? a.name : id; }).join(" · ");
const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");

type ForgeCat = "armas" | "escudos" | "armadura";
const catOf = (r: Recipe): ForgeCat => r.kind === "weapon" ? "armas" : r.gear?.slot === "offhand" ? "escudos" : "armadura";
const CATS: { id: ForgeCat; label: string }[] = [
  { id: "armas", label: "Armas" }, { id: "escudos", label: "Escudos" }, { id: "armadura", label: "Armadura" },
];

export function Forge({ player, gold, materials, onForge, onClose }: {
  player: Creature; gold: number; materials: Mats;
  onForge: (r: Recipe) => void; onClose: () => void;
}) {
  const [cat, setCat] = useState<ForgeCat>("armas");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shown = RECIPES.filter((r) => catOf(r) === cat);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shophead">
          <div className="cap" style={{ margin: 0 }}>⚒️ Herrería</div>
          <div className="goldbox">◈ {gold}</div>
        </div>
        <p className="foot" style={{ marginTop: 0 }}>Entrega materiales (los juntas al pelear y rebuscar) + oro para forjar equipo que no se compra en ningún lado.</p>

        <div className="tabs">
          {CATS.map((c) => (
            <button key={c.id} className={"tab" + (cat === c.id ? " on" : "")} onClick={() => { setCat(c.id); setConfirmId(null); }}>{c.label}</button>
          ))}
        </div>

        <div className="shopbody">
          {shown.length === 0 && <div className="forgeempty">Aún no hay recetas de {cat === "escudos" ? "escudos" : cat} — próximamente.</div>}
          {shown.map((r) => {
            const chk = canForge(r, gold, materials, player.characteristics);
            const out = r.kind === "weapon" ? r.weapon! : r.gear!;
            const reqObj = r.kind === "weapon" ? r.weapon!.req : r.gear!.req;
            const reqOk = chk.req;
            return (
              <div className="forgeitem" key={r.id}>
                <div className="forgehead">
                  <div>
                    <b>{out.name}</b>
                    {r.kind === "weapon"
                      ? <small>daño {r.weapon!.damage} · {moveText(r.weapon!.abilities)}</small>
                      : <small>defensa +{r.gear!.defense} · {r.gear!.note}</small>}
                    {!reqOk && <small className="reqline">requiere {reqText(reqObj, player.characteristics)}</small>}
                  </div>
                  {confirmId === r.id
                    ? (
                      <div className="confirmrow">
                        <span className="confirmq">¿Forjar?</span>
                        <button className="small" onClick={() => { onForge(r); setConfirmId(null); }}>Sí</button>
                        <button className="small ghost" onClick={() => setConfirmId(null)}>No</button>
                      </div>
                    )
                    : <button className="small" disabled={!chk.ok} onClick={() => setConfirmId(r.id)}>Forjar</button>}
                </div>
                <div className="forgecost">
                  <span className={"costchip" + (chk.gold ? "" : " miss")}>◈ {r.gold}</span>
                  {r.materials.map((m) => {
                    const have = materials[m.id] ?? 0;
                    return <span key={m.id} className={"costchip" + (have >= m.qty ? "" : " miss")}>{matIcon(m.id)} {matName(m.id)} {have}/{m.qty}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
