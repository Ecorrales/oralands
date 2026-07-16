import type { Creature, Characteristics } from "../engine";
import { ENERGY_MAX, energyRaiseCost } from "../engine";
import { t, statLabel, statDesc } from "../game/i18n";
import { STAT_KEYS } from "../game/catalog";

export function StatsInline({ player, points, onSpend, onRaiseEnergy }: {
  player: Creature; points: number;
  onSpend: (k: keyof Characteristics) => void;
  onRaiseEnergy: () => void;
}) {
  const cost = energyRaiseCost(player.maxEnergy);
  const maxed = player.maxEnergy >= ENERGY_MAX;

  return (
    <>
      <div className="statlist">
        {STAT_KEYS.map((k) => (
          <div className="statline" key={k}>
            <div className="slnamewrap">
              <span className="slname">{statLabel(k)}</span>
              <span className="sldesc">{statDesc(k)}</span>
            </div>
            <b className="slval">{player.characteristics[k]}</b>
            {points > 0 ? <button className="step" onClick={() => onSpend(k)}>+</button> : <span className="stepspace" />}
          </div>
        ))}
      </div>
      {points > 0 && <div className="ptnote">Tienes <b>{points}</b> punto(s) para repartir.</div>}

      {/* ENERGÍA — apartado propio: stat con tope, barra de 12 segmentos y costo incremental */}
      <div className="energyblock">
        <div className="eb-head">
          <span className="eb-label">{t("common.energyLbl")}</span>
          <span className="eb-val">{player.maxEnergy} / {ENERGY_MAX}</span>
        </div>
        <div className="eb-bar">
          {Array.from({ length: ENERGY_MAX }).map((_, i) => (
            <span key={i} className={"eb-seg" + (i < player.maxEnergy ? " on" : "")} />
          ))}
        </div>
        {maxed ? (
          <div className="eb-maxed">{t("energy.maxed")}</div>
        ) : (
          <div className="eb-raise">
            <span className="eb-next">{t("energy.next", { n: player.maxEnergy + 1 })} · {t("energy.cost", { c: cost })}</span>
            <button className="eb-btn" disabled={points < cost} onClick={onRaiseEnergy}>{t("energy.raise", { c: cost })}</button>
          </div>
        )}
      </div>

      <div className="derived" style={{ marginTop: 12 }}>
        <div className="dcard"><div className="big">{player.maxHp}</div><div className="lbl">{t("common.maxHp")}</div></div>
        <div className="dcard"><div className="big">{player.regen}</div><div className="lbl">regen ⚡</div></div>
      </div>
    </>
  );
}
