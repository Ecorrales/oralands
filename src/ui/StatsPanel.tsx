import type { Creature, Characteristics } from "../engine";
import { StatsInline } from "./StatsInline";

export function StatsPanel({ player, points, onSpend, onRaiseEnergy, onRaisePotionSlot, onClose }: {
  player: Creature; points: number;
  onSpend: (k: keyof Characteristics) => void; onRaiseEnergy: () => void; onRaisePotionSlot: () => void; onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="statspanel" onClick={(e) => e.stopPropagation()}>
        <div className="cap">{player.name} · Nivel {player.level}</div>
        <StatsInline player={player} points={points} onSpend={onSpend} onRaiseEnergy={onRaiseEnergy} onRaisePotionSlot={onRaisePotionSlot} />
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
