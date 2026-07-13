import type { Creature } from "../engine";
import { effectiveCharacteristics } from "../engine";
import { SLOT_ES, SLOT_ROWS, reqMetGear, type GearItem, type EquipSlot } from "../game/gear";

// promedio de un dado "NdM" = N*(M+1)/2
const avgDice = (spec: string): number => {
  const m = /^(\d+)d(\d+)$/.exec(spec.trim());
  if (!m) return 0;
  const n = +m[1], f = +m[2];
  return n * (f + 1) / 2;
};

export function EquipPanel({ player, gear, equipped, onEquip, onUnequip, onClose }: {
  player: Creature; gear: GearItem[]; equipped: Partial<Record<EquipSlot, string>>;
  onEquip: (g: GearItem) => void; onUnequip: (s: EquipSlot) => void; onClose: () => void;
}) {
  const equippedItem = (slot: EquipSlot): GearItem | null => {
    const id = equipped[slot]; return id ? gear.find((g) => g.id === id) ?? null : null;
  };
  const ownedFor = (slot: EquipSlot) => gear.filter((g) => g.slot === slot);

  // Ofensiva del arma equipada + características efectivas (incluye penalizaciones de equipo).
  const eff = effectiveCharacteristics(player);
  const dmgDice = /^(\d+)d(\d+)$/.exec(player.weapon.damage.trim());
  const dmgMin = dmgDice ? Math.round(Math.max(+dmgDice[1] * eff.strength, eff.strength / 2)) : 0;
  const dmgMax = dmgDice ? Math.round(+dmgDice[1] * +dmgDice[2] * eff.strength) : 0;
  const accEst = Math.round(2 * eff.intelligence * ((2 * eff.dexterity) + 1) / 2 + avgDice(player.weapon.accuracy));

  // celda de la tabla de equipo
  const cell = (slot: EquipSlot) => {
    if (slot === "mainhand") {
      return (
        <div className="eqcell filled" key={slot}>
          <div className="eqslot">{SLOT_ES[slot]}</div>
          <div className="eqname">{player.weapon.name}{player.weapon.twoHanded ? " (2M)" : ""}</div>
          <div className="eqhint">se cambia en la mochila</div>
        </div>
      );
    }
    const it = equippedItem(slot);
    const fillable = slot === "offhand" || slot === "chest";
    return (
      <div className={"eqcell" + (it ? " filled" : "") + (fillable ? "" : " soon")} key={slot}>
        <div className="eqslot">{SLOT_ES[slot]}</div>
        <div className="eqname">{it ? it.name : fillable ? "vacío" : "—"}</div>
        {it && <div className="eqhint">def +{it.defense ?? 0}{it.evasion ? ` · ev ${it.evasion > 0 ? "+" : ""}${it.evasion}` : ""}</div>}
        {!it && !fillable && <div className="eqhint">pronto</div>}
      </div>
    );
  };

  const slots: EquipSlot[] = ["chest", "offhand"]; // ranuras editables por ahora
  const owned = slots.flatMap(ownedFor);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="statspanel wide" onClick={(e) => e.stopPropagation()}>
        <div className="cap">Equipo · {player.name}</div>
        <div className="eqsummary">Daño <b>{dmgMin}–{dmgMax}</b> · Precisión ≈ <b>{accEst}</b></div>
        <div className="eqsummary">Defensa <b>{player.defense ?? 0}</b> · Evasión <b>{(player.evasionBonus ?? 0) >= 0 ? "+" : ""}{player.evasionBonus ?? 0}</b></div>
        <div className="eqhelp">Rango de un golpe base (arma × fuerza). El daño real varía por habilidad, dados y la defensa del enemigo.</div>

        <div className="eqgrid">
          {SLOT_ROWS.map((row, i) => (
            <div className={"eqrow r" + row.length} key={i}>{row.map(cell)}</div>
          ))}
        </div>

        <div className="cap" style={{ marginTop: 16 }}>Tu equipo</div>
        {owned.length === 0 && <p className="foot">No tienes escudos ni armaduras. Cómpralos en la tienda o fórjalos.</p>}
        {owned.map((g) => {
          const on = equipped[g.slot] === g.id;
          const ok = reqMetGear(g, player.characteristics);
          const twoHandBlock = g.slot === "offhand" && player.weapon.twoHanded;
          return (
            <div className={"invitem" + (on ? " eq" : "")} key={g.id}>
              <div className="invinfo">
                <b>{g.name} <span className="soft">({SLOT_ES[g.slot].toLowerCase()})</span></b>
                <small>defensa +{g.defense ?? 0}{g.evasion ? ` · evasión ${g.evasion > 0 ? "+" : ""}${g.evasion}` : ""}{g.note ? ` · ${g.note}` : ""}</small>
                {twoHandBlock && <small className="reqline">requiere una mano libre (arma a 2 manos)</small>}
                {!ok && <small className="reqline">no cumples requisitos</small>}
              </div>
              {on ? <button className="small ghost" onClick={() => onUnequip(g.slot)}>Quitar</button>
                : <button className="small" disabled={!ok || twoHandBlock} onClick={() => onEquip(g)}>Equipar</button>}
            </div>
          );
        })}

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
