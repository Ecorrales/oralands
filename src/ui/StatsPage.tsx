import { useEffect, useState } from "react";
import { t } from "../game/i18n";

interface Stats {
  generatedAt: string;
  players: number;
  maxLevel: number; avgLevel: number;
  maxGold: number; avgGold: number;
  maxNemesis: number; deepestRun: number;
  strongestNemesis: { name: string; level: number };
  top10: { rank: number; name: string; level: number; gold: number; maxDepth: number }[];
}

export function StatsPage({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("https://oralands-default-rtdb.firebaseio.com/stats/global.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (!data) throw new Error("sin datos"); setStats(data); })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="panel">
      <div className="cap">{t("stats.title")}</div>
      {error ? (
        <p className="selsub">{t("stats.empty")}</p>
      ) : !stats ? (
        <p className="selsub">{t("stats.loading")}</p>
      ) : (
        <>
          <p className="selsub">{t("stats.players", { n: stats.players })}</p>
          <div className="statgrid">
            <div className="statcell"><span className="statnum">{stats.maxLevel}</span><span className="statlbl">{t("stats.maxLevel")}</span></div>
            <div className="statcell"><span className="statnum">{stats.avgLevel}</span><span className="statlbl">{t("stats.avgLevel")}</span></div>
            <div className="statcell"><span className="statnum">◈ {stats.maxGold}</span><span className="statlbl">{t("stats.maxGold")}</span></div>
            <div className="statcell"><span className="statnum">◈ {stats.avgGold}</span><span className="statlbl">{t("stats.avgGold")}</span></div>
            <div className="statcell"><span className="statnum">{stats.deepestRun}</span><span className="statlbl">{t("stats.deepest")}</span></div>
            <div className="statcell"><span className="statnum">{stats.maxNemesis}</span><span className="statlbl">{t("stats.maxNemesis")}</span></div>
          </div>

          <div className="statnemesis">
            <span className="statlbl">☠ {t("stats.strongestNemesis")}</span>
            <b>{stats.strongestNemesis.name} · {t("common.lvAbbr")} {stats.strongestNemesis.level}</b>
          </div>

          <div className="cap" style={{ marginTop: 18 }}>{t("stats.top10")}</div>
          <div className="toplist">
            {stats.top10.map((p) => (
              <div className="toprow" key={p.rank}>
                <span className="toprank">#{p.rank}</span>
                <span className="topname">{p.name}</span>
                <span className="topmeta">{t("common.lvAbbr")} {p.level} · ◈ {p.gold}</span>
              </div>
            ))}
            {stats.top10.length === 0 && <p className="selsub">{t("stats.noPlayers")}</p>}
          </div>

          <p className="statfoot">{t("stats.updated")} {new Date(stats.generatedAt).toLocaleString()}</p>
        </>
      )}
      <button className="ghost full" style={{ marginTop: 12 }} onClick={onBack}>{t("common.back")}</button>
    </div>
  );
}
