import { useState } from "react";
import { t, statAbbr, tName, abilityName } from "../game/i18n";
import type { Creature } from "../engine";
import { getAbility } from "../engine";
import { RECIPES, canForge, type Recipe } from "../game/forge";
import { STAT_ES } from "../game/catalog";
import { matName, matIcon, type Mats } from "../game/materials";

const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? abilityName(a.id) : id; }).join(" · ");
const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req ?? {}).map(([k, v]) => `${statAbbr(k).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");

type ForgeCat = "armas" | "escudos" | "armadura";
const catOf = (r: Recipe): ForgeCat => r.kind === "weapon" ? "armas" : r.gear?.slot === "offhand" ? "escudos" : "armadura";
const CATS: { id: ForgeCat; label: string }[] = [
  { id: "armas", label: "forge.catWeapons" }, { id: "escudos", label: "forge.catShields" }, { id: "armadura", label: "forge.catArmor" },
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
          <div className="cap" style={{ margin: 0 }}>{t("forge.title")}</div>
          <div className="goldbox">◈ {gold}</div>
        </div>
        <p className="foot" style={{ marginTop: 0 }}>{t("forge.hint")}</p>

        <div className="tabs">
          {CATS.map((c) => (
            <button key={c.id} className={"tab" + (cat === c.id ? " on" : "")} onClick={() => { setCat(c.id); setConfirmId(null); }}>{t(c.label)}</button>
          ))}
        </div>

        <div className="shopbody">
          {shown.length === 0 && <div className="forgeempty">{t("forge.noRecipes")}</div>}
          {shown.map((r) => {
            const chk = canForge(r, gold, materials, player.characteristics);
            const out = r.kind === "weapon" ? r.weapon! : r.gear!;
            const reqObj = r.kind === "weapon" ? r.weapon!.req : r.gear!.req;
            const reqOk = chk.req;
            return (
              <div className="forgeitem" key={r.id}>
                <div className="forgehead">
                  <div>
                    <b>{tName(out.name)}</b>
                    {r.kind === "weapon"
                      ? <small>{t("common.damageLbl")}{r.weapon!.damage} · {moveText(r.weapon!.abilities)}</small>
                      : <small>{t("common.defenseLbl")} +{r.gear!.defense} · {tName(r.gear!.note)}</small>}
                    {!reqOk && <small className="reqline">{t("shop.requires", { req: reqText(reqObj, player.characteristics) })}</small>}
                  </div>
                  {confirmId === r.id
                    ? (
                      <div className="confirmrow">
                        <span className="confirmq">{t("forge.confirm")}</span>
                        <button className="small" onClick={() => { onForge(r); setConfirmId(null); }}>{t("common.yes")}</button>
                        <button className="small ghost" onClick={() => setConfirmId(null)}>No</button>
                      </div>
                    )
                    : <button className="small" disabled={!chk.ok} onClick={() => setConfirmId(r.id)}>{t("common.forgeVerb")}</button>}
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
          <button className="primary" onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  );
}
