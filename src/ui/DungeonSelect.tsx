import { DUNGEON_TYPES } from "../game/dungeons";
import { t, tName } from "../game/i18n";

/** Pantalla de selección de mazmorra. Las difíciles se bloquean por nivel de personaje. */
export function DungeonSelect({ level, onPick, onBack }: {
  level: number;
  onPick: (dungeonId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="panel">
      <div className="cap">{t("select.title")}</div>
      <p className="selsub">{t("select.sub")}</p>
      <div className="dungeonlist">
        {DUNGEON_TYPES.map((d) => {
          const unlocked = level >= d.minLevel;
          return (
            <button
              key={d.id}
              className={"dungeoncard" + (unlocked ? "" : " locked")}
              disabled={!unlocked}
              onClick={() => unlocked && onPick(d.id)}
            >
              <div className="dcard-top">
                <span className="dcard-name">{tName(d.name)}</span>
                {!unlocked && <span className="dcard-lock">🔒 {t("common.lvAbbr")} {d.minLevel}</span>}
              </div>
              <div className="dcard-desc">{tName(d.desc)}</div>
            </button>
          );
        })}
      </div>
      <button className="ghost full" style={{ marginTop: 12 }} onClick={onBack}>{t("common.back")}</button>
    </div>
  );
}
