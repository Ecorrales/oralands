import { useState } from "react";
import type { Creature } from "../engine";
import { getAbility } from "../engine";
import {
  SHOP_WEAPONS, POTION_PRICE, sellValue, groupWeapons, reqMet, STAT_ES,
  type WeaponOpt,
} from "../game/catalog";
import { SHIELDS, SHOP_ARMOR, reqMetGear, type GearItem, type EquipSlot } from "../game/gear";
import { MATERIALS, matIcon, matName, matSell, type Mats } from "../game/materials";

const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");
const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? a.name : id; }).join(" · ");

export function Shop({ player, gold, potions, inventory, equipped, materials, onBuyPotion, onBuyWeapon, onBuyGear, onSell, onSellAll, onSellMaterial, onSellAllMaterials, onClose }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; equipped: Partial<Record<EquipSlot, string>>; materials: Mats;
  onBuyPotion: () => void; onBuyWeapon: (w: WeaponOpt) => void; onBuyGear: (g: GearItem) => void;
  onSell: (id: string) => void; onSellAll: () => void; onSellMaterial: (id: string, qty: number) => void; onSellAllMaterials: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
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
          <b>{g.name}{on && <span className="eqtag"> puesto</span>}</b>
          <small>defensa +{g.defense ?? 0}{g.evasion ? ` · evasión ${g.evasion > 0 ? "+" : ""}${g.evasion}` : ""}{g.abilities ? ` · da ${moveText(g.abilities)}` : ""}</small>
          {!ok && <small className="reqline">requiere {reqText(g.req, player.characteristics)}</small>}
          {twoHandBlock && <small className="reqline">tienes un arma a dos manos</small>}
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
          <div className="cap" style={{ margin: 0 }}>Tienda del refugio</div>
          <div className="goldbox">◈ {gold}</div>
        </div>
        <div className="tabs">
          <button className={"tab" + (tab === "buy" ? " on" : "")} onClick={() => setTab("buy")}>Comprar</button>
          <button className={"tab" + (tab === "sell" ? " on" : "")} onClick={() => setTab("sell")}>Vender</button>
        </div>

        <div className="shopbody">
          {tab === "buy" ? (
            <>
              <div className="baghead">Consumibles</div>
              <div className="shopitem">
                <div className="invinfo"><b>Poción {potions > 0 && <span className="qty">tienes ×{potions}</span>}</b><small>cura 40% de vida al instante</small></div>
                <button className="small" disabled={gold < POTION_PRICE} onClick={onBuyPotion}>◈ {POTION_PRICE}</button>
              </div>

              <div className="baghead">Armas</div>
              {SHOP_WEAPONS.map((w) => {
                const ok = reqMet(w.req, player.characteristics);
                return (
                  <div className="shopitem" key={w.id}>
                    <div className="invinfo">
                      <b>{w.name}{w.twoHanded && <span className="soft"> · 2 manos</span>}</b>
                      <small>daño {w.damage} · {moveText(w.abilities)}</small>
                      {!ok && <small className="reqline">requiere {reqText(w.req, player.characteristics)}</small>}
                    </div>
                    <button className="small" disabled={gold < w.price} onClick={() => onBuyWeapon(w)}>◈ {w.price}</button>
                  </div>
                );
              })}

              <div className="baghead">Escudos (mano izquierda)</div>
              {SHIELDS.map(gearRow)}

              <div className="baghead">Armaduras (pecho)</div>
              {SHOP_ARMOR.map(gearRow)}
              <p className="foot">Lo pesado y lo fino se consigue por forja, misión o botín.</p>
            </>
          ) : (
            <>
              <div className="selltop">
                <div className="baghead" style={{ margin: 0 }}>Tu arsenal</div>
                <button className="small" disabled={dupEarn <= 0} onClick={onSellAll}>Vender repetidos +◈{dupEarn}</button>
              </div>
              {groups.length === 0 && <p className="foot">No tienes armas que vender.</p>}
              {groups.map(({ item: w, qty }) => {
                const equippedW = w.id === player.weapon.id;
                const sellable = qty - (equippedW ? 1 : 0);
                return (
                  <div className="shopitem" key={w.id}>
                    <div className="invinfo">
                      <b>{w.name} <span className="qty">×{qty}</span>{equippedW && <span className="eqtag"> equipada</span>}</b>
                      <small>vende por ◈ {sellValue(w)} c/u{equippedW ? " · conservas la equipada" : ""}</small>
                    </div>
                    <button className="small" disabled={sellable <= 0} onClick={() => onSell(w.id)}>Vender ◈{sellValue(w)}</button>
                  </div>
                );
              })}

              <div className="selltop" style={{ marginTop: 14 }}>
                <div className="baghead" style={{ margin: 0 }}>Materiales</div>
                {ownedMats.length > 0 && <button className="small" onClick={onSellAllMaterials}>Vender todo +◈{allMatsEarn}</button>}
              </div>
              {ownedMats.length === 0 && <p className="foot">No tienes materiales que vender.</p>}
              {ownedMats.map((m) => {
                const have = materials[m.id];
                return (
                  <div className="shopitem" key={m.id}>
                    <div className="invinfo">
                      <b>{matIcon(m.id)} {matName(m.id)} <span className="qty">×{have}</span></b>
                      <small>vende por ◈ {matSell(m.id)} c/u</small>
                    </div>
                    <div className="matsellbtns">
                      <button className="small ghost" onClick={() => onSellMaterial(m.id, 1)}>−1 ◈{matSell(m.id)}</button>
                      <button className="small" onClick={() => onSellMaterial(m.id, have)}>Todo ◈{matSell(m.id) * have}</button>
                    </div>
                  </div>
                );
              })}
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
