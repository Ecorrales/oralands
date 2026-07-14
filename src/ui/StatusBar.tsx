import { xpToNext } from "../game/progression";
import { t } from "../game/i18n";

export function StatusBar({ level, xp, points, onOpenStats }: {
  level: number; xp: number; points: number; onOpenStats: () => void;
}) {
  const next = xpToNext(level);
  const pct = Math.max(0, Math.min(100, xp / next * 100));
  return (
    <div className="statusbar">
      <div className="lvlbadge">{t("common.lvAbbr")} {level}</div>
      <div className="xpwrap">
        <div className="xptrack"><div className="xpfill" style={{ width: pct + "%" }} /></div>
        <div className="xptxt">{t("status.xpLine", { xp, next, rem: Math.max(0, next - xp) })}</div>
      </div>
      <button className="statsbtn" onClick={onOpenStats}>
        Stats{points > 0 && <span className="ptbadge">{points}</span>}
      </button>
    </div>
  );
}
