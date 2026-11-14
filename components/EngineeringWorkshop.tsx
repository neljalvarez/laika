import { MODULES } from "@/data/modules";
import { upgradeCost } from "@/game/upgrades";
import { MODULE_IDS, type MissionState, type ModuleId } from "@/game/types";

interface Props {
  state: MissionState;
  selected: ModuleId | null;
  onSelect: (id: ModuleId) => void;
}

/** Overview of all six modules: level, condition and next upgrade cost. */
export function EngineeringWorkshop({ state, selected, onSelect }: Props) {
  return (
    <section className="panel" aria-label="Engineering workshop">
      <div className="panel-title">
        <span>Engineering Workshop</span>
        <span className={`tag ${state.actionsLeft > 0 ? "tag-ok" : "tag-warn"}`} style={{ color: "#2a1a22" }}>
          Actions {state.actionsLeft}/1
        </span>
      </div>
      <div className="p-2">
        <p className="mb-2 text-[12px]">
          One upgrade <em>or</em> repair per sol. Materials are limited, so every build is a trade-off.
        </p>
        <table className="report" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th scope="col">Module</th>
              <th scope="col">Lv</th>
              <th scope="col">Cond</th>
              <th scope="col">Next</th>
            </tr>
          </thead>
          <tbody>
            {MODULE_IDS.map((id) => {
              const m = state.modules[id];
              const cost = upgradeCost(state, id);
              return (
                <tr key={id} style={selected === id ? { background: "#F2CA76" } : undefined}>
                  <td>
                    <button
                      type="button"
                      className="w-full cursor-pointer text-left font-extrabold uppercase underline"
                      onClick={() => onSelect(id)}
                      aria-label={`Inspect ${MODULES[id].name}`}
                    >
                      {MODULES[id].name}
                    </button>
                  </td>
                  <td>{m.level}/3</td>
                  <td>
                    {Math.round(m.condition)}%{m.condition < 60 ? " !" : ""}
                  </td>
                  <td>{cost === null ? "MAX" : `${cost} mat`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
