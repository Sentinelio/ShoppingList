import type { CSSProperties, ReactNode } from "react";
import { paletteVars, type Palette, type ThemeView } from "../../data/themes";
import type { Item } from "../../lib/pocketbase";
import ItemRow from "../items/ItemRow";
import StoreTab from "../list/StoreTab";
import BottomNav from "../list/BottomNav";
import { IconBack, IconMore } from "../ui/icons";

// A small phone (390 × 600, shown at `scale`) rendering one screen of the
// app with `palette`. Lista and Tienda use the real components, so the
// preview is exactly what users get.

const W = 390;
const H = 600;

const item = (id: string, es: string, pl: string, en: string, category: string, extra: Partial<Item> = {}): Item => ({
  id, list_id: "preview", original: es, translations: { es, pl, en }, category,
  qty: "", unit: "", note: "", brand: "", photo: null, important: false,
  checked: false, checked_at: null, added_by: "u1", added_by_name: "Manu", created_at: "2026-10-01T10:00:00Z",
  ...extra,
});

const ITEMS: Item[] = [
  item("p1", "leche", "mleko", "milk", "dairy", { qty: "2", unit: "L", important: true }),
  item("p2", "huevos", "jajka", "eggs", "dairy", { qty: "12", unit: "x" }),
  item("p3", "mantequilla", "masło", "butter", "dairy", { checked: true }),
  item("p4", "tomates", "pomidory", "tomatoes", "vegetables", { qty: "6", unit: "x" }),
];

const noop = () => {};

function Frame({ palette, view, scale, children }: { palette: Palette; view: ThemeView; scale: number; children: ReactNode }) {
  const vars = paletteVars(palette);
  const { "color-scheme": scheme, ...custom } = vars;
  return (
    <div style={{ width: W * scale, height: H * scale, overflow: "hidden", borderRadius: 14 * scale + 4 }}>
      <div
        data-theme-preview={view}
        style={{
          ...(custom as CSSProperties),
          colorScheme: scheme,
          width: W, height: H, zoom: scale,
          background: "var(--color-bg)", color: "var(--color-text)",
          display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ListHeader({ title }: { title: string }) {
  return (
    <header className="shrink-0 h-14 flex items-center gap-1 px-1.5">
      <span className="w-11 h-11 flex items-center justify-center text-text-soft"><IconBack /></span>
      <div className="flex-1 min-w-0">
        <div className="truncate text-[18px] font-bold text-text">{title}</div>
        <div className="mt-1.5 h-[5px] rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
          <div className="h-full rounded-full" style={{ width: "40%", background: "var(--color-accent)" }} />
        </div>
      </div>
      <span className="w-11 h-11 flex items-center justify-center text-text-soft"><IconMore /></span>
    </header>
  );
}

function ListsScreen() {
  const rows = [
    { flag: "🇵🇱", name: "Compra semanal", sub: "7 por comprar · hoy" },
    { flag: "🇪🇸", name: "Casa de la playa", sub: "3 por comprar · ayer" },
    { flag: "🇩🇪", name: "Viaje a Berlín", sub: "Todo comprado" },
  ];
  return (
    <>
      <header className="shrink-0 h-14 flex items-center gap-2 pl-4 pr-2">
        <h1 className="flex-1 text-[22px] font-bold text-text">Mis listas</h1>
        <span className="h-10 px-4 rounded-full text-[14px] font-semibold flex items-center" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>Unirme</span>
        <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}>M</span>
      </header>
      <main className="flex-1 px-3">
        <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden mt-1">
          {rows.map(r => (
            <div key={r.name} className="flex items-center gap-3 px-3 min-h-[72px] py-2">
              <span className="w-12 h-12 rounded-[14px] bg-bg flex items-center justify-center text-[26px]">{r.flag}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-[16px] font-semibold text-text">{r.name}</span>
                <span className="block truncate text-[13px] text-text-muted">{r.sub}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 px-1 text-[13px] font-semibold text-text-soft">Solicitudes enviadas</div>
        <div className="mt-2 rounded-[14px] bg-card px-3 py-3 flex items-center gap-3">
          <span className="flex-1 text-[14px] text-text">Lista de Ola</span>
          <span className="h-9 px-3 rounded-xl text-[13px] font-semibold flex items-center" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>Cancelar</span>
        </div>
      </main>
      <span className="absolute bottom-6 right-5 h-14 w-14 rounded-2xl flex items-center justify-center text-[28px] font-bold"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}>+</span>
    </>
  );
}

function ListScreen() {
  const pending = ITEMS.filter(i => !i.checked);
  return (
    <>
      <ListHeader title="Compra semanal" />
      <div className="shrink-0 flex gap-1.5 px-3 pb-2">
        {["Por comprar 3", "Comprados 1", "No hay 0"].map((f, i) => (
          <span key={f} className="flex-1 h-8 rounded-full text-[12.5px] font-semibold flex items-center justify-center"
            style={{ background: i === 0 ? "var(--color-accent-soft)" : "var(--color-card)", color: i === 0 ? "var(--color-accent-ink)" : "var(--color-text-soft)" }}>{f}</span>
        ))}
      </div>
      <main className="flex-1 overflow-hidden px-3">
        {[["Lácteos · Nabiał", pending.filter(i => i.category === "dairy")], ["Verduras · Warzywa", pending.filter(i => i.category === "vegetables")]].map(([name, rows]) => (
          <section key={name as string} className="mb-3">
            <div className="min-h-[44px] flex items-center px-1 text-[14px] font-bold" style={{ color: "var(--color-accent)" }}>{name as string}</div>
            <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
              {(rows as Item[]).map(i => <ItemRow key={i.id} item={i} listLang="pl" userLang="es" onToggle={noop} onOpen={noop} />)}
            </div>
          </section>
        ))}
      </main>
      <BottomNav tab="list" onTab={noop} onAdd={noop} lang="es" />
    </>
  );
}

function StoreScreen() {
  return (
    <>
      <ListHeader title="Compra semanal" />
      <StoreTab items={ITEMS.filter(i => !i.checked)} startItemId="p1" listLang="pl" userLang="es" />
      <BottomNav tab="store" onTab={noop} onAdd={noop} lang="es" />
    </>
  );
}

// Mirrors ItemDetail's "Mostrar" pane: side tab bar, name to show, icon,
// quantity and the action buttons.
function DetailsScreen() {
  const tabs = ["🏪", "✏️", "💰", "🌍", "📊", "💬", "📋"];
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="flex overflow-hidden" style={{ width: W - 70, height: H - 60, borderRadius: 20, background: "var(--color-bg)", border: "1px solid var(--color-border-light)" }}>
        <div className="flex flex-col gap-1 p-1.5" style={{ width: 46, borderRight: "1px solid var(--color-border)" }}>
          {tabs.map((e, i) => (
            <span key={e} className="h-10 rounded-xl flex items-center justify-center text-[17px]"
              style={{ background: i === 0 ? "var(--color-card)" : "transparent" }}>{e}</span>
          ))}
        </div>
        <div className="flex-1 flex flex-col items-center px-3 pt-5 pb-3 text-center">
          <div className="text-[30px] font-black" style={{ color: "var(--color-primary-name)" }}>Mleko</div>
          <div className="text-[13px]" style={{ color: "var(--color-secondary-name)" }}>(Leche)</div>
          <div className="mt-6 w-[120px] h-[120px] rounded-[28px] flex items-center justify-center text-[64px]"
            style={{ background: "color-mix(in srgb, var(--color-info) 18%, transparent)" }}>🥛</div>
          <div className="mt-auto text-[18px] font-extrabold" style={{ color: "var(--color-accent)" }}>2 L</div>
          <div className="mt-2 w-full py-2.5 rounded-xl font-bold text-[13px]" style={{ background: "color-mix(in srgb, var(--color-danger) 15%, transparent)", color: "var(--color-danger)" }}>🚫 No hay</div>
          <div className="mt-2 w-full py-2.5 rounded-xl font-bold text-[13px]" style={{ background: "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: "var(--color-accent)" }}>🛍️ Mostrar en la tienda</div>
          <div className="mt-2 text-[10px] font-bold" style={{ color: "var(--color-text-muted)" }}>Preguntas para el dependiente ▼</div>
        </div>
      </div>
    </div>
  );
}

export default function ThemePreview({ palette, view, scale = 0.38 }: { palette: Palette; view: ThemeView; scale?: number }) {
  return (
    <Frame palette={palette} view={view} scale={scale}>
      <div className="relative flex-1 flex flex-col min-h-0">
        {view === "lists" && <ListsScreen />}
        {view === "list" && <ListScreen />}
        {view === "store" && <StoreScreen />}
        {view === "details" && <DetailsScreen />}
      </div>
    </Frame>
  );
}
