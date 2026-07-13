import type { Creature, Characteristics } from "../engine";
import { STAT_KEYS, STAT_ES, STAT_DESC } from "../game/catalog";

export function StatsInline({ player, points, onSpend }: {
  player: Creature; points: number; onSpend: (k: keyof Characteristics) => void;
}) {
  return (
    <>
      <div className="statlist">
        {STAT_KEYS.map((k) => (
          <div className="statline" key={k}>
            <div className="slnamewrap">
              <span className="slname">{STAT_ES[k]}</span>
              <span className="sldesc">{STAT_DESC[k]}</span>
            </div>
            <b className="slval">{player.characteristics[k]}</b>
            {points > 0 ? <button className="step" onClick={() => onSpend(k)}>+</button> : <span className="stepspace" />}
          </div>
        ))}
      </div>
      {points > 0 && <div className="ptnote">Tienes <b>{points}</b> punto(s) para repartir.</div>}
      <div className="derived" style={{ marginTop: 12 }}>
        <div className="dcard"><div className="big">{player.maxHp}</div><div className="lbl">vida máx</div></div>
        <div className="dcard"><div className="big">{player.maxEnergy}</div><div className="lbl">energía</div></div>
        <div className="dcard"><div className="big">{player.regen}</div><div className="lbl">regen ⚡</div></div>
      </div>
    </>
  );
}
