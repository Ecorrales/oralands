import type { Creature } from "../engine";
import { getAbility } from "../engine";
import { STAT_ES, reqMet, groupWeapons, type WeaponOpt } from "../game/catalog";

export function InventoryInline({ player, inventory, onEquip }: {
  player: Creature; inventory: WeaponOpt[]; onEquip: (w: WeaponOpt) => void;
}) {
  const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? `${a.name} ${a.energyCost}⚡` : id; }).join(" · ");
  const groups = groupWeapons(inventory);
  if (groups.length === 0) return <p className="foot">Mochila vacía.</p>;
  return (
    <>
      {groups.map(({ item: w, qty }) => {
        const equipped = w.id === player.weapon.id;
        const ok = reqMet(w.req, player.characteristics);
        const reqTxt = Object.entries(w.req)
          .map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}${player.characteristics[k as keyof typeof player.characteristics] < (v as number) ? " ✗" : ""}`)
          .join(" · ");
        return (
          <div key={w.id} className={"invitem" + (equipped ? " eq" : "")}>
            <div className="invinfo">
              <b>{w.name}{qty > 1 && <span className="qty">×{qty}</span>}{equipped && <span className="eqtag"> equipada</span>}</b>
              <small>daño {w.damage} · {moveText(w.abilities)}</small>
              {!ok && <small className="reqline">requiere {reqTxt}</small>}
            </div>
            {equipped ? <span className="eqmark">✓</span>
              : ok ? <button className="small" onClick={() => onEquip(w)}>Equipar</button>
              : <span className="lockmini">bloqueada</span>}
          </div>
        );
      })}
    </>
  );
}
