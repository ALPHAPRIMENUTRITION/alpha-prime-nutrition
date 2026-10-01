"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Plus, Repeat, StickyNote, Trash2, X } from "lucide-react";
import {
  formatQty,
  itemMacros,
  optionMacros,
  unitLabel,
  type Food,
  type PlanItem,
  type PlanMeal,
} from "@/lib/nutrition/plan";
import { Input, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { FoodPicker } from "@/components/nutrition/food-picker";
import { cn } from "@/lib/cn";

export interface MealHandlers {
  rename: (mealId: string, name: string) => void;
  setNotes: (mealId: string, notes: string) => void;
  move: (mealId: string, dir: -1 | 1) => void;
  remove: (mealId: string) => Promise<void>;
  copy: (mealId: string) => void;
  addOption: (mealId: string, copyFrom?: string) => void;
  renameOption: (optionId: string, label: string) => void;
  removeOption: (optionId: string) => Promise<void>;
  addItem: (optionId: string, food: Food, qty: number) => Promise<boolean>;
  setQty: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => Promise<void>;
  addSub: (itemId: string, food: Food, qty: number, notes: string) => Promise<boolean>;
  removeSub: (subId: string) => Promise<void>;
  foodCreated: (food: Food) => void;
}

const m1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("es-SV");

export function MealCard({
  meal,
  index,
  total,
  foods,
  foodMap,
  h,
}: {
  meal: PlanMeal;
  index: number;
  total: number;
  foods: Food[];
  foodMap: Map<string, Food>;
  h: MealHandlers;
}) {
  const [optIdx, setOptIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(meal.notes));
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const opt = meal.options[Math.min(optIdx, meal.options.length - 1)];
  const totals = optionMacros(opt, foodMap);

  return (
    <article className="rounded-card border border-line bg-panel" aria-label={meal.name}>
      {/* Encabezado */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = String(new FormData(e.currentTarget).get("name") ?? "");
                if (v.trim() && v.trim() !== meal.name) h.rename(meal.id, v);
                setEditingName(false);
              }}
            >
              <Input name="name" defaultValue={meal.name} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} aria-label="Nombre de la comida" className="h-9" maxLength={80} />
            </form>
          ) : (
            <button type="button" onClick={() => setEditingName(true)} className="group flex items-center gap-2 text-left">
              <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">{meal.name}</h3>
              <Pencil size={14} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" aria-label="Editar nombre" />
            </button>
          )}
          <p className="tnum text-xs text-muted">
            {Math.round(totals.kcal)} kcal · P {m1(totals.protein)} · C {m1(totals.carbs)} · G {m1(totals.fat)}
            {meal.options.length > 1 && ` · ${opt?.label}`}
          </p>
        </div>
        <div className="relative flex items-center gap-1">
          <button type="button" onClick={() => h.copy(meal.id)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg" aria-label="Copiar comida a otros días" title="Copiar a otros días">
            <Copy size={17} />
          </button>
          <button type="button" onClick={() => setMenu((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg" aria-label="Más acciones" aria-expanded={menu}>
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 flex w-52 flex-col rounded-xl border border-line bg-graphite p-1.5 shadow-xl" onMouseLeave={() => setMenu(false)}>
              <MenuBtn icon={ArrowUp} label="Subir" disabled={index === 0} onClick={() => { h.move(meal.id, -1); setMenu(false); }} />
              <MenuBtn icon={ArrowDown} label="Bajar" disabled={index === total - 1} onClick={() => { h.move(meal.id, 1); setMenu(false); }} />
              <MenuBtn icon={StickyNote} label={showNotes ? "Ocultar nota" : "Agregar nota"} onClick={() => { setShowNotes((v) => !v); setMenu(false); }} />
              <div className="px-1 py-1">
                <ConfirmButton action={() => h.remove(meal.id)} label={<><Trash2 size={15} /> Eliminar comida</>} confirmText="¿Eliminar?" confirmLabel="Sí" size="xs" />
              </div>
            </div>
          )}
        </div>
      </header>

      {showNotes && (
        <div className="border-b border-line px-4 py-3">
          <label className="sr-only" htmlFor={`notes_${meal.id}`}>Nota de la comida</label>
          <Textarea
            id={`notes_${meal.id}`}
            defaultValue={meal.notes ?? ""}
            placeholder="Indicaciones para el cliente (ej. tomar 1 h antes de entrenar)"
            className="min-h-16 text-sm"
            maxLength={1000}
            onBlur={(e) => e.target.value !== (meal.notes ?? "") && h.setNotes(meal.id, e.target.value)}
          />
        </div>
      )}

      {/* Opciones */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2" role="tablist" aria-label="Opciones">
        {meal.options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={i === optIdx}
            onClick={() => setOptIdx(i)}
            className={cn("rounded-full px-3 py-1 text-xs font-semibold", i === optIdx ? "bg-fg text-ink" : "bg-panel-2 text-muted hover:text-fg")}
          >
            {o.label}
          </button>
        ))}
        <button type="button" onClick={() => h.addOption(meal.id, opt?.id)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-red hover:bg-panel-2" title="Nueva opción copiando la actual">
          <Plus size={13} /> Opción
        </button>
        {opt && meal.options.length > 1 && (
          <span className="ml-auto flex items-center gap-1">
            {renaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = String(new FormData(e.currentTarget).get("label") ?? "").trim();
                  if (v && v !== opt.label) h.renameOption(opt.id, v);
                  setRenaming(false);
                }}
              >
                <Input name="label" defaultValue={opt.label} autoFocus maxLength={40} aria-label="Nombre de la opción" className="h-8 w-36 text-xs" onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
              </form>
            ) : (
              <button type="button" onClick={() => setRenaming(true)} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs text-muted hover:text-fg">
                <Pencil size={12} /> Renombrar
              </button>
            )}
            <ConfirmButton action={() => h.removeOption(opt.id).then(() => setOptIdx(0))} label={<><X size={13} /> Quitar {opt.label}</>} confirmText="¿Quitar opción?" confirmLabel="Sí" size="xs" />
          </span>
        )}
      </div>

      {/* Alimentos */}
      <ul className="divide-y divide-line">
        {opt?.items.map((item) => (
          <ItemRow key={item.id} item={item} food={foodMap.get(item.food_id)} foods={foods} foodMap={foodMap} h={h} />
        ))}
        {opt && opt.items.length === 0 && <li className="px-4 py-4 text-sm text-faint">Sin alimentos en esta opción.</li>}
      </ul>

      <div className="border-t border-line px-4 py-3">
        {adding && opt ? (
          <div className="flex flex-col gap-2">
            <FoodPicker
              idPrefix={`add_${opt.id}`}
              foods={foods}
              onFoodCreated={h.foodCreated}
              onPick={async (f, q) => {
                const ok = await h.addItem(opt.id, f, q);
                if (ok) setAdding(false);
                return ok;
              }}
            />
            <button type="button" onClick={() => setAdding(false)} className="w-fit text-sm text-muted underline hover:text-fg">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red hover:underline">
            <Plus size={16} /> Agregar alimento
          </button>
        )}
      </div>
    </article>
  );
}

function MenuBtn({ icon: Icon, label, onClick, disabled }: { icon: typeof ArrowUp; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-panel-2 disabled:opacity-40">
      <Icon size={15} /> {label}
    </button>
  );
}

function ItemRow({ item, food, foods, foodMap, h }: { item: PlanItem; food: Food | undefined; foods: Food[]; foodMap: Map<string, Food>; h: MealHandlers }) {
  const [subsOpen, setSubsOpen] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));
  const mac = itemMacros(food, Number(qty.replace(",", ".")) || 0);

  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[1fr_8.5rem_auto]">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{food?.name ?? "Alimento no disponible"}</p>
          <p className="tnum text-xs text-muted">
            {Math.round(mac.kcal)} kcal · P {m1(mac.protein)} · C {m1(mac.carbs)} · G {m1(mac.fat)}
          </p>
        </div>
        <label className="col-start-1 row-start-2 flex items-center gap-2 sm:col-start-2 sm:row-start-1">
          <span className="sr-only">Cantidad de {food?.name}</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step={food?.unit === "unidad" ? 0.5 : 1}
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              const n = Number(e.target.value.replace(",", "."));
              if (n > 0) h.setQty(item.id, n);
            }}
            className="h-9 w-24 text-right"
          />
          <span className="w-14 text-xs text-muted">{food ? unitLabel(food.unit, Number(qty)) : ""}</span>
        </label>
        <div className="row-span-2 flex items-center gap-0.5 sm:row-span-1">
          <button
            type="button"
            onClick={() => setSubsOpen((v) => !v)}
            className={cn("relative grid h-9 w-9 place-items-center rounded-full hover:bg-panel-2", item.subs.length ? "text-fg" : "text-muted")}
            aria-label={`Sustituciones (${item.subs.length})`}
            aria-expanded={subsOpen}
            title="Sustituciones"
          >
            <Repeat size={16} />
            {item.subs.length > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">{item.subs.length}</span>}
          </button>
          <ConfirmButton action={() => h.removeItem(item.id)} label={<Trash2 size={15} aria-label={`Quitar ${food?.name ?? "alimento"}`} />} confirmText="¿Quitar?" confirmLabel="Sí" size="xs" />
        </div>
      </div>

      {subsOpen && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-graphite p-3">
          <p className="eyebrow">Sustituciones de {food?.name}</p>
          {item.subs.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {item.subs.map((s) => {
                const sf = foodMap.get(s.food_id);
                const sm = itemMacros(sf, s.quantity);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{sf ? `${formatQty(s.quantity, sf.unit)} de ${sf.name}` : "Alimento no disponible"}</span>
                      <span className="tnum block text-xs text-muted">
                        {Math.round(sm.kcal)} kcal · P {m1(sm.protein)} · C {m1(sm.carbs)} · G {m1(sm.fat)}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </span>
                    </span>
                    <ConfirmButton action={() => h.removeSub(s.id)} label={<Trash2 size={14} aria-label="Quitar sustitución" />} confirmText="¿Quitar?" confirmLabel="Sí" size="xs" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-faint">Sin sustituciones. Agregá alternativas equivalentes para dar flexibilidad.</p>
          )}
          <FoodPicker
            idPrefix={`sub_${item.id}`}
            foods={foods}
            onFoodCreated={h.foodCreated}
            submitLabel="Agregar sustitución"
            withNotes
            onPick={(f, q, notes) => h.addSub(item.id, f, q, notes)}
          />
        </div>
      )}
    </li>
  );
}
