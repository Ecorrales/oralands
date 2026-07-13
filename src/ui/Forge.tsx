import type { Creature } from "../engine";
import { getAbility } from "../engine";
import { RECIPES, countById, canForge, type Recipe } from "../game/forge";
import { STAT_ES } from "../game/catalog";

const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? a.name : id; }).join(" · ");
const reqText = (req: Partial<Record<string, number>>, ch: Creature["characteristics"]) =>
  Object.entries(req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}${ch[k as keyof typeof ch] < (v as number) ? " ✗" : ""}`).join(" · ");

export function Forge({ player, gold, inventory, onForge, onClose }: {
  player: Creature; gold: number; inventory: import("../game/catalog").WeaponOpt[];
  onForge: (r: Recipe) => void; onClose: () => void;
}) {
  const counts = countById(inventory);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shophead">
          <div className="cap" style={{ margin: 0 }}>⚒️ Herrería</div>
          <div className="goldbox">◈ {gold}</div>
        </div>
        <p className="foot" style={{ marginTop: 0 }}>Entrega armas de tu mochila + oro para forjar equipo que no se compra en ningún lado.</p>

        <div className="shopbody">
          {RECIPES.map((r) => {
            const chk = canForge(r, gold, inventory, player.characteristics);
            const out = r.kind === "weapon" ? r.weapon! : r.gear!;
            const reqObj = r.kind === "weapon" ? r.weapon!.req : r.gear!.req;
            const reqOk = chk.req;
            return (
              <div className="forgeitem" key={r.id}>
                <div className="forgehead">
                  <div>
                    <b>{out.name}</b>
                    {r.kind === "weapon"
                      ? <small>daño {r.weapon!.damage} · {moveText(r.weapon!.abilities)}</small>
                      : <small>defensa +{r.gear!.defense} · {r.gear!.note}</small>}
                    {!reqOk && <small className="reqline">requiere {reqText(reqObj, player.characteristics)}</small>}
                  </div>
                  <button className="small" disabled={!chk.ok} onClick={() => onForge(r)}>Forjar</button>
                </div>
                <div className="forgecost">
                  <span className={"costchip" + (chk.gold ? "" : " miss")}>◈ {r.gold}</span>
                  {r.materials.map((m) => {
                    const have = counts[m.id] || 0;
                    return <span key={m.id} className={"costchip" + (have >= m.qty ? "" : " miss")}>{m.name} {have}/{m.qty}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
