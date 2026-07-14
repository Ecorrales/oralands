import { useState } from "react";
import { t, statAbbr } from "../game/i18n";
import type { Creature } from "../engine";
import { STAT_KEYS, STAT_ES, type WeaponOpt } from "../game/catalog";
import type { GearItem } from "../game/gear";
import { MATERIALS, matIcon, matName, matSource, type Mats } from "../game/materials";
import type { Cargado } from "../game/cargados";
import { InventoryInline } from "./InventoryInline";

export function Hub({ player, gold, potions, inventory, equippedGear, cargados, materials, onFight, onNew, onEquip, onOpenShop, onOpenForge, onOpenEquip }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; equippedGear: GearItem[]; cargados: Cargado[];
  onFight: () => void; onNew: () => void; onEquip: (w: WeaponOpt) => void; onOpenShop: () => void; onOpenForge: () => void; onOpenEquip: () => void; materials: Mats;
}) {
  const [bagTab, setBagTab] = useState<"armas" | "materiales">("armas");
  const [confirmNew, setConfirmNew] = useState(false);
  const ownedMats = MATERIALS.filter((m) => (materials[m.id] ?? 0) > 0);
  return (
    <div className="panel">
      <div className="cap">Tu personaje <span className="tag">guardado</span></div>
      <div className="sheet">
        <div className="sheethead">
          <div>
            <div className="sheetname">{player.name}</div>
            <div className="sheetsub">Nv {player.level} · {player.weapon.name}{player.weapon.twoHanded ? " (2M)" : ""} · def {player.defense ?? 0}</div>
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

      <div className="cap">Mochila</div>
      <div className="bag">
        <div className="bagline"><span className="bagicon">⚗</span> Pociones <b>{potions}</b></div>
        <div className="bagline"><span className="bagicon">◈</span> Oro <b>{gold}</b></div>
        <div className="bagline"><span className="bagicon">◈</span> Equipo <b>{equippedGear.length ? equippedGear.map((g) => g.name).join(" · ") : "—"}</b></div>

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
                  <small>Nv {c.creature.level} · {c.kindLabel} · lleva ◈ {c.gold}{c.weapon ? ` + tu ${c.weapon.name}` : ""}</small>
                </div>
              </div>
            ))}
            <p className="foot" style={{ marginBottom: 0 }}>{t("hub.nemesisHint")}</p>
          </div>
        </>
      )}

      <div className="actions" style={{ marginTop: 14 }}>
        <button className="primary" onClick={onFight}>{t("hub.enter")}</button>
        <button onClick={onOpenEquip}>{t("hub.equip")}</button>
        <button onClick={onOpenShop}>{t("hub.shop")}</button>
        <button onClick={onOpenForge}>{t("hub.forge")}</button>
        {confirmNew
          ? (
            <div className="confirmrow">
              <span className="confirmq">{t("hub.confirmNew", { name: player.name })}</span>
              <button className="small danger" onClick={onNew}>{t("hub.yesDelete")}</button>
              <button className="small ghost" onClick={() => setConfirmNew(false)}>{t("hub.no")}</button>
            </div>
          )
          : <button onClick={() => setConfirmNew(true)}>{t("hub.newChar")}</button>}
      </div>
    </div>
  );
}
