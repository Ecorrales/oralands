import { useState } from "react";
import type { Creature } from "../engine";
import { getAbility } from "../engine";
import {
  SHOP_WEAPONS, SHOP_ARMORS, POTION_PRICE, sellValue, groupWeapons, reqMet, STAT_ES,
  type WeaponOpt, type ArmorOpt,
} from "../game/catalog";

const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");
const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? a.name : id; }).join(" · ");

export function Shop({ player, gold, potions, inventory, armor, onBuyPotion, onBuyWeapon, onBuyArmor, onSell, onSellAll, onClose }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; armor: ArmorOpt | null;
  onBuyPotion: () => void; onBuyWeapon: (w: WeaponOpt) => void; onBuyArmor: (a: ArmorOpt) => void;
  onSell: (id: string) => void; onSellAll: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const groups = groupWeapons(inventory);
  const dupEarn = (() => { const seen = new Set<string>(); let sum = 0; for (const w of inventory) { if (seen.has(w.id)) sum += sellValue(w); else seen.add(w.id); } return sum; })();

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
                      <b>{w.name}</b>
                      <small>daño {w.damage} · {moveText(w.abilities)}</small>
                      {!ok && <small className="reqline">requiere {reqText(w.req, player.characteristics)}</small>}
                    </div>
                    <button className="small" disabled={gold < w.price} onClick={() => onBuyWeapon(w)}>◈ {w.price}</button>
                  </div>
                );
              })}

              <div className="baghead">Armaduras</div>
              {SHOP_ARMORS.map((a) => {
                const ok = reqMet(a.req, player.characteristics);
                const equipped = armor?.id === a.id;
                return (
                  <div className={"shopitem" + (equipped ? " eq" : "")} key={a.id}>
                    <div className="invinfo">
                      <b>{a.name}{equipped && <span className="eqtag"> puesta</span>}</b>
                      <small>{a.note} · resiste derribo/dolor/sangrado</small>
                      {!ok && <small className="reqline">requiere {reqText(a.req, player.characteristics)}</small>}
                    </div>
                    {equipped ? <span className="eqmark">✓</span>
                      : <button className="small" disabled={gold < a.price || !ok} onClick={() => onBuyArmor(a)}>◈ {a.price}</button>}
                  </div>
                );
              })}
              <p className="foot">Lo pesado y lo fino se consigue por forja, misión o botín — no en la tienda.</p>
            </>
          ) : (
            <>
              <div className="selltop">
                <div className="baghead" style={{ margin: 0 }}>Tu arsenal</div>
                <button className="small" disabled={dupEarn <= 0} onClick={onSellAll}>Vender repetidos +◈{dupEarn}</button>
              </div>
              {groups.length === 0 && <p className="foot">No tienes armas que vender.</p>}
              {groups.map(({ item: w, qty }) => {
                const equipped = w.id === player.weapon.id;
                const sellable = qty - (equipped ? 1 : 0);
                return (
                  <div className="shopitem" key={w.id}>
                    <div className="invinfo">
                      <b>{w.name} <span className="qty">×{qty}</span>{equipped && <span className="eqtag"> equipada</span>}</b>
                      <small>vende por ◈ {sellValue(w)} c/u{equipped ? " · conservas la equipada" : ""}</small>
                    </div>
                    <button className="small" disabled={sellable <= 0} onClick={() => onSell(w.id)}>Vender ◈{sellValue(w)}</button>
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
