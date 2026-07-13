import { useMemo, useState } from "react";
import {
  makeCreature, getHealthForLevel, maxEnergy, energyRegen,
  type Characteristics, type Creature,
} from "../engine";
import {
  STARTER_WEAPONS, STAT_KEYS, STAT_ES, STAT_BUDGET, STAT_MIN, STAT_MAX, reqMet, toWeapon,
  type WeaponOpt,
} from "../game/catalog";
import { getAbility } from "../engine";

// Qué hace cada característica (sacado de las fórmulas reales del motor).
const STAT_DESC: Record<keyof Characteristics, string> = {
  strength: "Energía máxima y regeneración por turno (mueves más golpes). También sube el daño de los ataques brutos.",
  vitality: "Tu vida máxima. Cuánto castigo aguantas antes de caer.",
  dexterity: "Precisión al pegar y evasión al esquivar. La velocidad y la mano fina.",
  intelligence: "Precisión al pegar y qué tanto hallas al rebuscar salas. El ojo astuto.",
};

export function CharacterCreate({ onCreate }: { onCreate: (p: Creature, inventory: WeaponOpt[]) => void }) {
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Characteristics>({ strength: 5, vitality: 5, dexterity: 5, intelligence: 5 });
  const [weaponId, setWeaponId] = useState("club");

  const used = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const remaining = STAT_BUDGET - used;

  const bump = (k: keyof Characteristics, d: number) =>
    setStats((s) => {
      const v = s[k] + d;
      if (v < STAT_MIN || v > STAT_MAX) return s;
      if (d > 0 && remaining <= 0) return s;
      return { ...s, [k]: v };
    });

  // si un arma deja de cumplir requisitos al mover stats, cae a garrote
  const effectiveWeapon = useMemo(() => {
    const w = STARTER_WEAPONS.find((x) => x.id === weaponId);
    return w && reqMet(w.req, stats) ? w : STARTER_WEAPONS[0];
  }, [weaponId, stats]);

  const canStart = name.trim().length > 0;

  function start() {
    const w = effectiveWeapon;
    const player = makeCreature(name.trim(), { ...stats }, 1, toWeapon(w), []);
    onCreate(player, [w]);   // arranca con su arma en el inventario
  }

  return (
    <div className="panel">
      <div className="cap">Nombre</div>
      <input className="tinput" type="text" value={name} maxLength={24}
        placeholder="¿Cómo te llamas, aventurero?" onChange={(e) => setName(e.target.value)} />

      <div className="cap">Reparte tus puntos <span className="soft">(mín 1 · máx 10)</span></div>
      <p className="statintro">Cada característica cambia cómo juegas. Piensa tu estilo antes de repartir.</p>
      {STAT_KEYS.map((k) => (
        <div className="statrow" key={k}>
          <div className="snamewrap">
            <span className="sname">{STAT_ES[k]}</span>
            <span className="sdesc">{STAT_DESC[k]}</span>
          </div>
          <button className="step" disabled={stats[k] <= STAT_MIN} onClick={() => bump(k, -1)}>−</button>
          <b className="sval">{stats[k]}</b>
          <button className="step" disabled={stats[k] >= STAT_MAX || remaining <= 0} onClick={() => bump(k, 1)}>+</button>
        </div>
      ))}
      <div className="rem">Puntos restantes: <b>{remaining}</b></div>

      <div className="derived">
        <div className="dcard"><div className="big">{getHealthForLevel(stats.vitality, 1)}</div><div className="lbl">vida máx</div></div>
        <div className="dcard"><div className="big">{maxEnergy(stats.strength, 1)}</div><div className="lbl">energía</div></div>
        <div className="dcard"><div className="big">{energyRegen(stats.strength, 1)}</div><div className="lbl">regen ⚡</div></div>
      </div>

      <div className="cap">Arma inicial</div>
      <div className="opts">
        {STARTER_WEAPONS.map((w) => {
          const ok = reqMet(w.req, stats);
          const sel = effectiveWeapon.id === w.id;
          const reqTxt = Object.entries(w.req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}`).join(" · ");
          return (
            <button key={w.id} disabled={!ok}
              className={"opt" + (sel ? " sel" : "") + (ok ? "" : " locked")}
              onClick={() => setWeaponId(w.id)}>
              <b>{w.name}</b>
              <small>{w.abilities.map((id) => { const a = getAbility(id); return a ? `${a.name} ${a.energyCost}⚡` : id; }).join(" · ")}</small>
              <small className="req">{ok ? w.note : "req: " + reqTxt}</small>
            </button>
          );
        })}
      </div>

      <button className="begin" disabled={!canStart} onClick={start}>Entrar a la cripta</button>
      <p className="foot">Los stats derivados salen en vivo de las fórmulas del motor. Arrancas sin armadura: la protección es botín de la cripta.</p>
    </div>
  );
}
