import type { Creature } from "../engine";
import { t, statAbbr, tName, abilityName } from "../game/i18n";
import { getAbility } from "../engine";
import { STAT_ES, reqMet, groupWeapons, type WeaponOpt } from "../game/catalog";

export function InventoryInline({ player, inventory, onEquip }: {
  player: Creature; inventory: WeaponOpt[]; onEquip: (w: WeaponOpt) => void;
}) {
  const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? `${abilityName(a.id)} ${a.energyCost}⚡` : id; }).join(" · ");
  const groups = groupWeapons(inventory);
  if (groups.length === 0) return <p className="foot">{t("inv.empty")}</p>;
  return (
    <>
      {groups.map(({ item: w, qty }) => {
        const equipped = w.id === player.weapon.id;
        const ok = reqMet(w.req, player.characteristics);
        const reqTxt = Object.entries(w.req ?? {})
          .map(([k, v]) => `${statAbbr(k).toLowerCase()} ${v}${player.characteristics[k as keyof typeof player.characteristics] < (v as number) ? " ✗" : ""}`)
          .join(" · ");
        return (
          <div key={w.id} className={"invitem" + (equipped ? " eq" : "")}>
            <div className="invinfo">
              <b>{tName(w.name)}{qty > 1 && <span className="qty">×{qty}</span>}{equipped && <span className="eqtag"> {t("shop.equippedTag")}</span>}</b>
              <small>{t("common.damageLbl")}{w.damage} · {w.twoHanded ? t("common.twoHandsLong") : t("common.oneHandLong")} · {moveText(w.abilities)}</small>
              {!ok && <small className="reqline">requiere {reqTxt}</small>}
            </div>
            {equipped ? <span className="eqmark">✓</span>
              : ok ? <button className="small" onClick={() => onEquip(w)}>{t("common.equipVerb")}</button>
              : <span className="lockmini">bloqueada</span>}
          </div>
        );
      })}
    </>
  );
}
