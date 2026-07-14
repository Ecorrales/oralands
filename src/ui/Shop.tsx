import { useState } from "react";
import { statAbbr, slotLabel, tName, abilityName, t } from "../game/i18n";
import type { Creature } from "../engine";
import { getAbility } from "../engine";
import {
  SHOP_WEAPONS, POTION_PRICE, sellValue, groupWeapons, reqMet, STAT_ES,
  type WeaponOpt,
} from "../game/catalog";
import { SHIELDS, SHOP_ARMOR, SLOT_ES, gearSellValue, reqMetGear, type GearItem, type EquipSlot } from "../game/gear";
import { MATERIALS, matIcon, matName, matSell, type Mats } from "../game/materials";

const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req ?? {}).map(([k, v]) => `${statAbbr(k).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");
const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? abilityName(a.id) : id; }).join(" · ");

type SellCat = "general" | "armas" | "equipo" | "materiales";
const SELL_CATS: { id: SellCat; label: string }[] = [
  { id: "general", label: "shop.tabGeneral" }, { id: "armas", label: "shop.tabWeapons" },
  { id: "equipo", label: "shop.tabGear" }, { id: "materiales", label: "shop.tabMaterials" },
];

export function Shop({ player, gold, potions, inventory, equipped, gear, materials, onBuyPotion, onBuyWeapon, onBuyGear, onSell, onSellAll, onSellGear, onSellMaterial, onSellAllMaterials, onClose }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; equipped: Partial<Record<EquipSlot, string>>; gear: GearItem[]; materials: Mats;
  onBuyPotion: () => void; onBuyWeapon: (w: WeaponOpt) => void; onBuyGear: (g: GearItem) => void;
  onSell: (id: string) => void; onSellAll: () => void; onSellGear: (id: string) => void; onSellMaterial: (id: string, qty: number) => void; onSellAllMaterials: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [sellCat, setSellCat] = useState<SellCat>("general");
  const groups = groupWeapons(inventory);
  const ownedMats = MATERIALS.filter((m) => (materials[m.id] ?? 0) > 0);
  const allMatsEarn = ownedMats.reduce((s, m) => s + matSell(m.id) * materials[m.id], 0);
  const dupEarn = (() => { const seen = new Set<string>(); let sum = 0; for (const w of inventory) { if (seen.has(w.id)) sum += sellValue(w); else seen.add(w.id); } return sum; })();

  const gearRow = (g: GearItem) => {
    const ok = reqMetGear(g, player.characteristics);
    const on = equipped[g.slot] === g.id;
    const twoHandBlock = g.slot === "offhand" && player.weapon.twoHanded;
    return (
      <div className={"shopitem" + (on ? " eq" : "")} key={g.id}>
        <div className="invinfo">
          <b>{tName(g.name)}{on && <span className="eqtag"> {t("common.worn")}</span>}</b>
          <small>{t("common.defenseLbl")} +{g.defense ?? 0}{g.evasion ? ` · ${t("common.evasionLbl")} ${g.evasion > 0 ? "+" : ""}${g.evasion}` : ""}{g.abilities ? ` · ${t("shop.grants", { moves: moveText(g.abilities) })}` : ""}</small>
          {!ok && <small className="reqline">{t("shop.requires", { req: reqText(g.req, player.characteristics) })}</small>}
          {twoHandBlock && <small className="reqline">{t("shop.haveTwoHand")}</small>}
        </div>
        {on ? <span className="eqmark">✓</span>
          : <button className="small" disabled={gold < g.price || !ok || twoHandBlock} onClick={() => onBuyGear(g)}>◈ {g.price}</button>}
      </div>
    );
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shophead">
          <div className="cap" style={{ margin: 0 }}>{t("shop.title")}</div>
          <div className="goldbox">◈ {gold}</div>
        </div>
        <div className="tabs">
          <button className={"tab" + (tab === "buy" ? " on" : "")} onClick={() => setTab("buy")}>{t("shop.buy")}</button>
          <button className={"tab" + (tab === "sell" ? " on" : "")} onClick={() => setTab("sell")}>{t("shop.sell")}</button>
        </div>

        <div className="shopbody">
          {tab === "buy" ? (
            <>
              <div className="baghead">{t("shop.consumables")}</div>
              <div className="shopitem">
                <div className="invinfo"><b>{t("shop.potionName")} {potions > 0 && <span className="qty">{t("shop.potionHave", { n: potions })}</span>}</b><small>{t("shop.potionDesc")}</small></div>
                <button className="small" disabled={gold < POTION_PRICE} onClick={onBuyPotion}>◈ {POTION_PRICE}</button>
              </div>

              <div className="baghead">{t("shop.tabWeapons")}</div>
              {SHOP_WEAPONS.map((w) => {
                const ok = reqMet(w.req, player.characteristics);
                return (
                  <div className="shopitem" key={w.id}>
                    <div className="invinfo">
                      <b>{tName(w.name)}<span className="soft"> · {w.twoHanded ? t("common.twoHands") : t("common.oneHand")}</span></b>
                      <small>{t("common.damageLbl")}{w.damage} · {moveText(w.abilities)}</small>
                      {!ok && <small className="reqline">{t("shop.requires", { req: reqText(w.req, player.characteristics) })}</small>}
                    </div>
                    <button className="small" disabled={gold < w.price} onClick={() => onBuyWeapon(w)}>◈ {w.price}</button>
                  </div>
                );
              })}

              <div className="baghead">{t("shop.shields")}</div>
              {SHIELDS.map(gearRow)}

              <div className="baghead">{t("shop.armors")}</div>
              {SHOP_ARMOR.map(gearRow)}
              <p className="foot">{t("shop.hardFineHint")}</p>
            </>
          ) : (
            <>
              <div className="subtabs">
                {SELL_CATS.map((c) => (
                  <button key={c.id} className={"subtab" + (sellCat === c.id ? " on" : "")} onClick={() => setSellCat(c.id)}>{t(c.label)}</button>
                ))}
              </div>

              {(sellCat === "general" || sellCat === "armas") && (
                <>
                  <div className="selltop">
                    <div className="baghead" style={{ margin: 0 }}>{t("shop.tabWeapons")}</div>
                    <button className="small" disabled={dupEarn <= 0} onClick={onSellAll}>{t("shop.sellDupes", { n: dupEarn })}</button>
                  </div>
                  {groups.length === 0 && <p className="foot">{t("shop.noWeaponsToSell")}</p>}
                  {groups.map(({ item: w, qty }) => {
                    const equippedW = w.id === player.weapon.id;
                    const sellable = qty - (equippedW ? 1 : 0);
                    return (
                      <div className="shopitem" key={w.id}>
                        <div className="invinfo">
                          <b>{tName(w.name)} <span className="qty">×{qty}</span>{equippedW && <span className="eqtag"> {t("shop.equippedTag")}</span>}</b>
                          <small>{t("shop.sellsForEach", { v: sellValue(w) })}{equippedW ? t("shop.keepEquipped") : ""}</small>
                        </div>
                        <button className="small" disabled={sellable <= 0} onClick={() => onSell(w.id)}>{t("shop.sellBtn", { v: sellValue(w) })}</button>
                      </div>
                    );
                  })}
                </>
              )}

              {(sellCat === "general" || sellCat === "equipo") && (
                <>
                  <div className="baghead" style={{ marginTop: sellCat === "general" ? 14 : 0 }}>{t("shop.tabGear")}</div>
                  {gear.length === 0 && <p className="foot">{t("shop.noGearToSell")}</p>}
                  {gear.map((g) => {
                    const on = equipped[g.slot] === g.id;
                    return (
                      <div className="shopitem" key={g.id}>
                        <div className="invinfo">
                          <b>{tName(g.name)}{on && <span className="eqtag"> {t("common.worn")}</span>}</b>
                          <small>{slotLabel(g.slot).toLowerCase()} · def +{g.defense ?? 0}{g.evasion ? ` · ev ${g.evasion > 0 ? "+" : ""}${g.evasion}` : ""} · {on ? t("shop.unequipToSell") : t("shop.sellsFor", { v: gearSellValue(g) })}</small>
                        </div>
                        {on
                          ? <span className="lockmini">{t("common.worn")}</span>
                          : <button className="small" onClick={() => onSellGear(g.id)}>{t("shop.sellBtn", { v: gearSellValue(g) })}</button>}
                      </div>
                    );
                  })}
                </>
              )}

              {(sellCat === "general" || sellCat === "materiales") && (
                <>
                  <div className="selltop" style={{ marginTop: sellCat === "general" ? 14 : 0 }}>
                    <div className="baghead" style={{ margin: 0 }}>{t("shop.tabMaterials")}</div>
                    {ownedMats.length > 0 && <button className="small" onClick={onSellAllMaterials}>{t("shop.sellAllMats", { n: allMatsEarn })}</button>}
                  </div>
                  {ownedMats.length === 0 && <p className="foot">{t("shop.noMatsToSell")}</p>}
                  {ownedMats.map((m) => {
                    const have = materials[m.id];
                    return (
                      <div className="shopitem" key={m.id}>
                        <div className="invinfo">
                          <b>{matIcon(m.id)} {matName(m.id)} <span className="qty">×{have}</span></b>
                          <small>{t("shop.sellsForEach", { v: matSell(m.id) })}</small>
                        </div>
                        <div className="matsellbtns">
                          <button className="small ghost" onClick={() => onSellMaterial(m.id, 1)}>−1 ◈{matSell(m.id)}</button>
                          <button className="small" onClick={() => onSellMaterial(m.id, have)}>{t("shop.allBtn", { v: matSell(m.id) * have })}</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
