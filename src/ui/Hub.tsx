import { useState } from "react";
import { t, statAbbr, tName } from "../game/i18n";
import type { Creature } from "../engine";
import { STAT_KEYS, STAT_ES, type WeaponOpt } from "../game/catalog";
import type { GearItem } from "../game/gear";
import { MATERIALS, matIcon, matName, matSource, type Mats } from "../game/materials";
import type { Cargado } from "../game/cargados";
import { InventoryInline } from "./InventoryInline";
import { titleToShow, type AwardedTitle } from "../game/titles";

export function Hub({ player, gold, potions, inventory, equippedGear, cargados, materials, titles = [], onFight, onNew, onEquip, onOpenShop, onOpenForge, onOpenEquip, onOpenStats }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; equippedGear: GearItem[]; cargados: Cargado[];
  onFight: () => void; onNew: () => void; onEquip: (w: WeaponOpt) => void; onOpenShop: () => void; onOpenForge: () => void; onOpenEquip: () => void; onOpenStats: () => void; materials: Mats;
  titles?: AwardedTitle[];
}) {
  const [bagTab, setBagTab] = useState<"armas" | "materiales">("armas");
  const [confirmNew, setConfirmNew] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const shownTitle = titleToShow(titles);
  const ownedMats = MATERIALS.filter((m) => (materials[m.id] ?? 0) > 0);
  return (
    <div className="panel">
      <div className="cap">{t("hub.characterSheet")} <span className="tag">{t("hub.saved")}</span></div>
      <div className="sheet">
        <div className="sheethead">
          <div>
            <div className="sheetname">{player.name}</div>
            {shownTitle && (
              <button onClick={() => setShowTitles(true)} style={{ background: "transparent", border: "none", padding: "2px 0 0", cursor: "pointer", color: "var(--accent)", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, letterSpacing: ".01em" }}>
                {shownTitle.name} <span style={{ opacity: .6 }}>›</span>
              </button>
            )}
            <div className="sheetsub">{t("common.lvAbbr")} {player.level} · {tName(player.weapon.name)}{player.weapon.twoHanded ? " " + t("common.twoHandTag") : ""} · def {player.defense ?? 0}</div>
          </div>
          <div className="goldbox">◈ {gold} · ⚗ {potions}</div>
        </div>
        <div className="statgrid">
          {STAT_KEYS.map((k) => (
            <div className="sg" key={k}><span>{statAbbr(k)}</span><b>{player.characteristics[k]}</b></div>
          ))}
          <div className="sg"><span>VID</span><b>{player.maxHp}</b></div>
          <div className="sg"><span>ENE</span><b>{player.maxEnergy}</b></div>
        </div>
      </div>

      <div className="cap">{t("hub.backpack")}</div>
      <div className="bag">
        <div className="bagline"><span className="bagicon">⚗</span> {t("hub.potions")} <b>{potions}</b></div>
        <div className="bagline"><span className="bagicon">◈</span> {t("common.gold")} <b>{gold}</b></div>
        <div className="bagline"><span className="bagicon">◈</span> {t("hub.bagLoot")} <b>{equippedGear.length ? equippedGear.map((g) => tName(g.name)).join(" · ") : "—"}</b></div>

        <div className="subtabs">
          <button className={"subtab" + (bagTab === "armas" ? " on" : "")} onClick={() => setBagTab("armas")}>{t("hub.bagWeapons")}</button>
          <button className={"subtab" + (bagTab === "materiales" ? " on" : "")} onClick={() => setBagTab("materiales")}>{t("hub.bagMaterials")}{ownedMats.length ? ` (${ownedMats.length})` : ""}</button>
        </div>

        {bagTab === "armas"
          ? <InventoryInline player={player} inventory={inventory} onEquip={onEquip} />
          : ownedMats.length === 0
            ? <div className="matempty">{t("hub.noMats")}</div>
            : (
              <div className="matgrid">
                {ownedMats.map((m) => (
                  <div className="matcard" key={m.id}>
                    <span className="mi">{matIcon(m.id)}</span>
                    <div className="mninfo">
                      <span className="mn">{matName(m.id)}</span>
                      <span className="msrc">{matSource(m.id)}</span>
                    </div>
                    <span className="mq">{materials[m.id]}</span>
                  </div>
                ))}
              </div>
            )}
      </div>

      {cargados.length > 0 && (
        <>
          <div className="cap">{t("hub.nemesisStalking")} <span className="tag">{cargados.length}</span></div>
          <div className="bag">
            {cargados.map((c) => (
              <div key={c.id} className="cargadoline">
                <div className="invinfo">
                  <b>{c.creature.name}</b>
                  <small>{t("common.lvAbbr")} {c.creature.level} · {tName(c.kindLabel)} · {t("hub.nemCarries", { gold: c.gold, weapon: c.weapon ? t("hub.plusYour", { weapon: tName(c.weapon.name) }) : "" })}</small>
                </div>
              </div>
            ))}
            <p className="foot" style={{ marginBottom: 0 }}>{t("hub.nemesisHint")}</p>
          </div>
        </>
      )}

      <button className="primary" onClick={onFight} style={{ marginTop: 16, width: "100%", padding: "18px", fontSize: 18, fontWeight: 700, letterSpacing: ".01em" }}>⚔️ {t("hub.enter")}</button>

      <fieldset style={{ marginTop: 16, border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px 14px" }}>
        <legend style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--accent)", padding: "0 8px" }}>{t("hub.town")}</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <button onClick={onOpenShop}>{t("hub.shop")}</button>
          <button onClick={onOpenForge}>{t("hub.forge")}</button>
          <button onClick={onOpenEquip}>{t("hub.equip")}</button>
          <button onClick={onOpenStats}>{t("hub.stats")}</button>
        </div>
        <div style={{ marginTop: 9 }}>
          {confirmNew
            ? (
              <div className="confirmrow">
                <span className="confirmq">{t("hub.confirmNew", { name: player.name })}</span>
                <button className="small danger" onClick={onNew}>{t("hub.yesDelete")}</button>
                <button className="small ghost" onClick={() => setConfirmNew(false)}>{t("hub.no")}</button>
              </div>
            )
            : <button className="ghost full" onClick={() => setConfirmNew(true)}>{t("hub.newChar")}</button>}
        </div>
      </fieldset>

      {showTitles && (
        <div onClick={() => setShowTitles(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(6,4,3,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 18px 14px", boxShadow: "0 20px 50px rgba(0,0,0,.6)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Gestas de {player.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>Los nombres que el calabozo te ha dado.</div>
            {[...titles].reverse().map((tt, i) => (
              <div key={i} style={{ borderTop: i ? "1px solid var(--line)" : "none", padding: "11px 0" }}>
                <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 17, color: tt.founder ? "#c9a24a" : "var(--ink)" }}>
                  {tt.name}{tt.founder && <span style={{ fontFamily: "var(--mono)", fontStyle: "normal", fontSize: 10, letterSpacing: ".18em", color: "var(--dim)", marginLeft: 8 }}>· UNO DE LOS TRES ·</span>}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>{t("common.lvAbbr")} {tt.level}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 5 }}>{tt.why}</div>
              </div>
            ))}
            <button className="primary full" style={{ marginTop: 14 }} onClick={() => setShowTitles(false)}>{t("common.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
