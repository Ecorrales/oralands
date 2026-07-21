import { useState } from "react";
import { DUNGEON_TYPES, difficultyOf } from "../game/dungeons";
import { t, tName } from "../game/i18n";

const DIF_COLOR: Record<string, string> = { easy: "#7fae5a", moderate: "#c9a24a", hard: "#d67c3a", lethal: "#c0453a" };

/** Selección de mazmorra + piso de entrada. Difíciles bloqueadas por nivel; pisos por llaves. */
export function DungeonSelect({ level, unlockedFloors, nemesisNames, onPick, onBack }: {
  level: number;
  unlockedFloors: Record<string, number[]>;
  nemesisNames?: Record<string, string>;
  onPick: (dungeonId: string, floor: number) => void;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [floor, setFloor] = useState<number>(1);

  const tapDungeon = (id: string) => {
    const floors = unlockedFloors[id] ?? [];
    if (floors.length === 0) { onPick(id, 1); return; }   // sin llaves: entra directo al piso 1
    setExpanded(expanded === id ? null : id); setFloor(1);
  };

  return (
    <div className="panel">
      <div className="cap">{t("select.title")}</div>
      <p className="selsub">{t("select.sub")}</p>
      <div className="dungeonlist">
        {DUNGEON_TYPES.map((d) => {
          const unlocked = level >= d.minLevel;
          const floors = [1, ...(unlockedFloors[d.id] ?? [])];
          const isOpen = expanded === d.id;
          return (
            <div key={d.id}>
              <button
                className={"dungeoncard" + (unlocked ? "" : " locked") + (isOpen ? " open" : "")}
                disabled={!unlocked}
                onClick={() => unlocked && tapDungeon(d.id)}
              >
                <div className="dcard-top">
                  <span className="dcard-name">{tName(d.name)}</span>
                  {!unlocked && <span className="dcard-lock">🔒 {t("common.lvAbbr")} {d.minLevel}</span>}
                  {unlocked && floors.length > 1 && <span className="dcard-lock">🗝️ {floors.length - 1}</span>}
                </div>
                <div className="dcard-desc">{tName(d.desc)}</div>
                <div className="dcard-dif" style={{ color: DIF_COLOR[difficultyOf(d.minLevel)], fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".04em", marginTop: 6 }}>
                  {t("select.dif." + difficultyOf(d.minLevel))} · {t("common.lvAbbr")} {d.minLevel}+
                </div>
                {nemesisNames?.[d.id] && (
                  <div className="dcard-nemesis" style={{ color: "#b06fe3", fontSize: 13.5, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 16 }}>{"\u2620\uFE0E"}</span>
                    {t("select.nemesisWaits", { name: nemesisNames[d.id] })}
                  </div>
                )}
              </button>
              {isOpen && (
                <div style={{ padding: "4px 4px 10px" }}>
                  <div className="floortitle">{t("select.startFloor")}</div>
                  <div className="floorpick">
                    {floors.map((f) => (
                      <button key={f} className={"floorbtn" + (floor === f ? " on" : "")} onClick={() => setFloor(f)}>
                        {t("select.floor", { n: f })}
                      </button>
                    ))}
                  </div>
                  <button className="primary full" style={{ marginTop: 6 }} onClick={() => onPick(d.id, floor)}>
                    {t("hub.enter")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className="ghost full" style={{ marginTop: 12 }} onClick={onBack}>{t("common.back")}</button>
    </div>
  );
}
