import { FolderPlus, Trash2, X, Check } from "lucide-react";
import { useState } from "react";
import {
  createGroup,
  removeGroup,
  renameGroup,
  toggleGroupItem,
  useGroups,
} from "../../lib/groups-store";

/**
 * "Meus Grupos": cria, renomeia e apaga grupos, e coloca/tira o canal
 * selecionado de cada um deles.
 */
export function GroupsDialog({
  open,
  onClose,
  channelId,
  channelName,
}: {
  open: boolean;
  onClose: () => void;
  channelId?: string;
  channelName?: string;
}) {
  const { groups } = useGroups();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/85 px-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-vexia-purple/40 bg-[#0B0B0F]/95 p-6 shadow-[0_0_60px_rgb(var(--vexia-primary-rgb)/0.35)]">
        <div className="flex items-center gap-3">
          <FolderPlus className="h-5 w-5 text-vexia-cyan" aria-hidden />
          <h2 className="flex-1 text-lg font-black text-white">Meus grupos</h2>
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Fechar"
            className="vexia-focus grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {channelName ? (
          <p className="mt-2 text-xs text-[#B6B6C2]">
            Marque em quais grupos <span className="font-bold text-vexia-cyan">{channelName}</span>{" "}
            deve aparecer.
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <input
            value={name}
            tabIndex={0}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createGroup(name);
                setName("");
              }
            }}
            placeholder="Nome do novo grupo"
            aria-label="Nome do novo grupo"
            className="vexia-focus min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none"
          />
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              createGroup(name);
              setName("");
            }}
            className="vexia-focus rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white"
          >
            Criar
          </button>
        </div>

        <div className="vexia-scroll mt-4 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#8C8C9C]">
              Nenhum grupo ainda. Crie o primeiro acima.
            </p>
          ) : null}
          {groups.map((g) => {
            const inside = channelId ? g.items.includes(channelId) : false;
            return (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2.5"
              >
                {editing === g.id ? (
                  <input
                    autoFocus
                    tabIndex={0}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameGroup(g.id, editName);
                        setEditing(null);
                      }
                    }}
                    aria-label={`Renomear ${g.name}`}
                    className="vexia-focus min-w-0 flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-sm text-white outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditing(g.id);
                      setEditName(g.name);
                    }}
                    className="vexia-focus min-w-0 flex-1 truncate text-left text-sm font-bold text-white"
                  >
                    {g.name}
                    <span className="ml-2 text-[11px] font-medium text-[#8C8C9C]">
                      {g.items.length} canal(is)
                    </span>
                  </button>
                )}

                {channelId ? (
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => toggleGroupItem(g.id, channelId)}
                    aria-pressed={inside}
                    className={`vexia-focus grid h-8 w-8 place-items-center rounded-lg border ${
                      inside
                        ? "border-vexia-cyan/60 bg-vexia-purple text-white"
                        : "border-white/15 text-[#B6B6C2]"
                    }`}
                    aria-label={inside ? "Remover do grupo" : "Adicionar ao grupo"}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}

                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => removeGroup(g.id)}
                  aria-label={`Apagar grupo ${g.name}`}
                  className="vexia-focus grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
