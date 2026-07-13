import type { Creature } from "../engine";
import { STAT_KEYS, STAT_ES, type WeaponOpt } from "../game/catalog";
import type { GearItem } from "../game/gear";
import { matsSummary, type Mats } from "../game/materials";
import type { Cargado } from "../game/cargados";
import { InventoryInline } from "./InventoryInline";

export function Hub({ player, gold, potions, inventory, equippedGear, cargados, materials, onFight, onNew, onEquip, onOpenShop, onOpenForge, onOpenEquip }: {
  player: Creature; gold: number; potions: number; inventory: WeaponOpt[]; equippedGear: GearItem[]; cargados: Cargado[];
  onFight: () => void; onNew: () => void; onEquip: (w: WeaponOpt) => void; onOpenShop: () => void; onOpenForge: () => void; onOpenEquip: () => void; materials: Mats;
}) {
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
            <div className="sg" key={k}><span>{STAT_ES[k].slice(0, 3)}</span><b>{player.characteristics[k]}</b></div>
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
        <div className="bagline"><span className="bagicon">⚒</span> Materiales <b>{matsSummary(materials) || "—"}</b></div>
        <div className="baghead">Armas</div>
        <InventoryInline player={player} inventory={inventory} onEquip={onEquip} />
      </div>

      {cargados.length > 0 && (
        <>
          <div className="cap">☠ Némesis acechando <span className="tag">{cargados.length}</span></div>
          <div className="bag">
            {cargados.map((c) => (
              <div key={c.id} className="cargadoline">
                <div className="invinfo">
                  <b>{c.creature.name}</b>
                  <small>Nv {c.creature.level} · {c.kindLabel} · lleva ◈ {c.gold}{c.weapon ? ` + tu ${c.weapon.name}` : ""}</small>
                </div>
              </div>
            ))}
            <p className="foot" style={{ marginBottom: 0 }}>Te esperan en la cripta. Véncelos para recuperar lo que te robaron.</p>
          </div>
        </>
      )}

      <div className="actions" style={{ marginTop: 14 }}>
        <button className="primary" onClick={onFight}>Bajar a la cripta</button>
        <button onClick={onOpenEquip}>Equipo</button>
        <button onClick={onOpenShop}>Tienda</button>
        <button onClick={onOpenForge}>Herrería</button>
        <button onClick={onNew}>Nuevo personaje</button>
      </div>
    </div>
  );
}
