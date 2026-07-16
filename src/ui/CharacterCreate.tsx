import { useMemo, useState } from "react";
import { t, statAbbr, statLabel, statDesc, tName, abilityName } from "../game/i18n";
import {
  makeCreature, getHealthForLevel, ENERGY_BASE, energyRegen,
  type Characteristics, type Creature,
} from "../engine";
import {
  STARTER_WEAPONS, STAT_KEYS, STAT_ES, STAT_DESC, STAT_BUDGET, STAT_MIN, STAT_MAX, reqMet, toWeapon,
  type WeaponOpt,
} from "../game/catalog";
import { getAbility } from "../engine";

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
        placeholder={t("create.namePrompt")} onChange={(e) => setName(e.target.value)} />

      <div className="cap">Reparte tus puntos <span className="soft">{t("create.minMax")}</span></div>
      <p className="statintro">{t("create.hint1")}</p>
      {STAT_KEYS.map((k) => (
        <div className="statrow" key={k}>
          <div className="snamewrap">
            <span className="sname">{statLabel(k)}</span>
            <span className="sdesc">{statDesc(k)}</span>
          </div>
          <button className="step" disabled={stats[k] <= STAT_MIN} onClick={() => bump(k, -1)}>−</button>
          <b className="sval">{stats[k]}</b>
          <button className="step" disabled={stats[k] >= STAT_MAX || remaining <= 0} onClick={() => bump(k, 1)}>+</button>
        </div>
      ))}
      <div className="rem">Puntos restantes: <b>{remaining}</b></div>

      <div className="derived">
        <div className="dcard"><div className="big">{getHealthForLevel(stats.vitality, 1)}</div><div className="lbl">{t("common.maxHp")}</div></div>
        <div className="dcard"><div className="big">{ENERGY_BASE}</div><div className="lbl">{t("common.energyLbl")}</div></div>
        <div className="dcard"><div className="big">{energyRegen(stats.strength, 1)}</div><div className="lbl">regen ⚡</div></div>
      </div>

      <div className="cap">Arma inicial</div>
      <div className="opts">
        {STARTER_WEAPONS.map((w) => {
          const ok = reqMet(w.req, stats);
          const sel = effectiveWeapon.id === w.id;
          const reqTxt = Object.entries(w.req ?? {}).map(([k, v]) => `${statAbbr(k).toLowerCase()} ${v}`).join(" · ");
          return (
            <button key={w.id} disabled={!ok}
              className={"opt" + (sel ? " sel" : "") + (ok ? "" : " locked")}
              onClick={() => setWeaponId(w.id)}>
              <b>{tName(w.name)}<span className="soft"> · {w.twoHanded ? t("common.twoHands") : t("common.oneHand")}</span></b>
              <small>{(w.abilities ?? []).map((id) => { const a = getAbility(id); return a ? `${abilityName(a.id)} ${a.energyCost}⚡` : id; }).join(" · ")}</small>
              <small className="req">{ok ? w.note : "req: " + reqTxt}</small>
            </button>
          );
        })}
      </div>

      <button className="begin" disabled={!canStart} onClick={start}>Entrar a la cripta</button>
      <p className="foot">{t("create.hint2")}</p>
    </div>
  );
}
