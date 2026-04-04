import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLists, deleteList } from "../hooks/useList";
import { IS_DEMO } from "../lib/supabase";
import { demoGetMembers, demoGetItems } from "../lib/demoStore";
import { t } from "../data/i18n";
import type { Lang } from "../data/i18n";
import type { List, ListMember, Item } from "../lib/supabase";
import SwipeRow from "../components/ui/SwipeRow";
import Modal from "../components/ui/Modal";
import CreateListModal from "../components/lists/CreateListModal";
import JoinListModal from "../components/lists/JoinListModal";
import { LANGS } from "../data/langs";
import { COUNTRIES } from "../data/countries";

interface ListsPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface ListCardInfo {
  list: List;
  members: ListMember[];
  items: Item[];
  uncheckedCount: number;
  pendingCount: number;
}

export default function ListsPage({ onNavigate }: ListsPageProps) {
  const { user, updateUser, logout } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;
  const { lists, loading, refresh } = useLists(user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const handleCreated = (listId: string) => {
    refresh();
    onNavigate("list-detail", { listId });
  };

  const handleJoined = () => {
    refresh();
  };

  const handleDelete = async (listId: string) => {
    try {
      await deleteList(listId);
      refresh();
    } catch {
      // ignore
    }
  };

  const cardInfos: ListCardInfo[] = lists.map((l) => {
    if (IS_DEMO) {
      const members = demoGetMembers(l.id);
      const items = demoGetItems(l.id);
      return {
        list: l,
        members,
        items,
        uncheckedCount: items.filter((i) => !i.checked).length,
        pendingCount: members.filter((m) => m.status === "pending").length,
      };
    }
    return {
      list: l,
      members: [],
      items: [],
      uncheckedCount: 0,
      pendingCount: 0,
    };
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-safe-top pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-text-muted text-xs">{t(lang, "welcome")}</p>
            <h1 className="text-2xl font-bold text-text mt-0.5">
              {user?.name ?? ""}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium active:brightness-90 transition-colors cursor-pointer"
            >
              <span>🔗</span>
              {t(lang, "join")}
            </button>
            <button
              type="button"
              onClick={() => { setShowSettings(true); setProfileName(user?.name ?? ""); }}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-text-soft active:bg-card transition-colors cursor-pointer"
              aria-label={t(lang, "settings")}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pt-2 pb-28 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : cardInfos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] opacity-60 mb-3">📝</div>
            <p className="text-text font-semibold text-lg mb-1">
              {t(lang, "noLists")}
            </p>
            <p className="text-text-muted text-sm max-w-[260px]">
              {t(lang, "tapCreate")}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {cardInfos.map((info) => (
              <SwipeRow
                key={info.list.id}
                id={info.list.id}
                lang={lang}
                onDelete={() => handleDelete(info.list.id)}
                onEdit={() => setEditListId(info.list.id)}
              >
                <button
                  type="button"
                  onClick={() =>
                    onNavigate("list-detail", { listId: info.list.id })
                  }
                  className="w-full text-left bg-card rounded-xl border border-border p-3.5 active:brightness-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: name + date */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-bold text-[16px] truncate">
                        {info.list.name}
                      </h3>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        {new Date(info.list.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Right: badges + avatars + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {info.uncheckedCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
                          {info.uncheckedCount}
                        </span>
                      )}
                      {info.pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold">
                          {info.pendingCount}
                        </span>
                      )}

                      {/* Member avatars */}
                      {info.members.length > 0 && (
                        <div className="flex items-center">
                          {info.members
                            .filter((m) => m.status === "active")
                            .slice(0, 3)
                            .map((member, i) => (
                              <div
                                key={member.user_id}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card"
                                style={{
                                  backgroundColor: "#888",
                                  marginLeft: i === 0 ? 0 : -8,
                                }}
                              >
                                {member.user_id.charAt(0).toUpperCase()}
                              </div>
                            ))}
                        </div>
                      )}

                      <span className="text-text-muted text-lg ml-1">
                        ›
                      </span>
                    </div>
                  </div>
                </button>
              </SwipeRow>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-2xl font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t(lang, "create")}
      >
        +
      </button>

      {/* Modals */}
      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      <JoinListModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={handleJoined}
      />

      {/* Edit List Modal (from swipe) */}
      {editListId && (() => {
        const editList = lists.find(l => l.id === editListId);
        if (!editList) return null;
        return (
          <Modal open={true} onClose={() => setEditListId(null)}>
            <h3 className="text-lg font-bold mb-4">⚙️ {editList.name}</h3>
            <div className="rounded-xl p-4 text-center mb-3" style={{ background: "rgba(240,136,62,0.06)", border: "1px solid rgba(240,136,62,0.2)" }}>
              <div className="text-text-muted text-xs mb-1.5">{t(lang, "shareCode")}</div>
              <div className="text-2xl font-extrabold font-mono tracking-widest text-accent">{editList.code}</div>
            </div>
            <button
              onClick={() => {
                try { navigator.clipboard.writeText(editList.code); } catch { try { const ta = document.createElement("textarea"); ta.value = editList.code; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch {} }
                setCopied(true); setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-3 rounded-xl font-semibold cursor-pointer active:brightness-90 text-white"
              style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
            >
              {copied ? `✓ ${t(lang, "copied")}` : `📋 ${t(lang, "copyCode")}`}
            </button>
            <button
              onClick={() => { handleDelete(editListId); setEditListId(null); }}
              className="w-full mt-3 py-3 rounded-xl font-semibold text-sm cursor-pointer"
              style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
            >
              🚪 {t(lang, "leave")}
            </button>
            <button onClick={() => setEditListId(null)} className="w-full mt-2 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
          </Modal>
        );
      })()}

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)}>
        <h3 className="text-lg font-bold mb-4">⚙️ {t(lang, "settings")}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "name")}</label>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              onBlur={() => { if (profileName.trim() && profileName.trim() !== user?.name) updateUser({ name: profileName.trim() }); }}
              className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "language")}</label>
              <div className="relative">
                <select
                  value={user?.lang ?? "en"}
                  onChange={e => updateUser({ lang: e.target.value })}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent appearance-none cursor-pointer text-sm"
                >
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▾</div>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "country")}</label>
              <div className="relative">
                <select
                  value={user?.country ?? "PL"}
                  onChange={e => updateUser({ country: e.target.value })}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent appearance-none cursor-pointer text-sm"
                >
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▾</div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-full mt-4 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
        <button onClick={() => { setShowSettings(false); setShowRoadmap(true); }} className="w-full mt-2 py-3 rounded-xl border font-medium cursor-pointer active:bg-card" style={{ borderColor: "rgba(108,138,255,0.3)", color: "#6c8aff" }}>🗺️ Roadmap</button>
        <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,92,92,0.05)", border: "1px solid rgba(255,92,92,0.15)" }}>
          <button
            onClick={() => { localStorage.clear(); logout(); window.location.reload(); }}
            className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer"
            style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
          >
            🔄 {t(lang, "logout")}
          </button>
        </div>
      </Modal>

      {/* Roadmap Modal */}
      <Modal open={showRoadmap} onClose={() => setShowRoadmap(false)}>
        <h3 className="text-lg font-bold mb-1">🗺️ BabelCart — Roadmap</h3>
        <p className="text-text-muted text-xs mb-3">Escribe en tu idioma. Compra en cualquier país.</p>

        {/* Unbreakable rules */}
        <div className="rounded-xl p-3 mb-4 border border-border-light" style={{ background: "rgba(255,255,255,0.03)" }}>
          <button onClick={() => setCollapsed(p => ({ ...p, rules: !p.rules }))} className="flex items-center gap-2 w-full text-left cursor-pointer text-xs font-bold text-text">
            <span className="text-[9px]" style={{ transform: collapsed.rules ? "" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
            🔒 REGLAS INQUEBRANTABLES
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg text-text-muted">7</span>
          </button>
          {!collapsed.rules && <div className="mt-2.5 space-y-1.5">
            {[
              ["🚫", "Cero anuncios. Nunca. Ni en free, ni en ningún tier. Estás en el pasillo del super, no en una valla publicitaria."],
              ["🔐", "Cero venta de datos. Tus patrones de compra son tuyos. No somos Listonic."],
              ["📤", "Export e import abiertos. Tus datos son tuyos. Si te vas, te llevas todo. Si vuelves, vuelves con todo."],
              ["⚡", "Sin registro obligatorio. Nombre, idioma, país. 10 segundos y estás dentro. Sin email, sin contraseña."],
              ["🌍", "Multilingüe de verdad. No es un añadido — es el core. Cada feature se diseña pensando en 5 idiomas, no en 1."],
              ["🤝", "Lo básico es gratis para siempre. Compartir, traducir, añadir miembros — nunca detrás de un paywall."],
              ["👁️", "Transparencia total. El roadmap está en la app. El usuario ve qué hay hecho, qué falta y hacia dónde vamos."],
            ].map(([icon, text], i) => (
              <div key={i} className="flex gap-2.5 text-xs text-text-soft leading-relaxed">
                <span className="shrink-0">{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>}
        </div>

        {[
          { title: "✅ MVP — Completado", color: "#3dd68c", items: [
            [true, "Listas compartidas multilingües"],
            [true, "Traducción automática vía Claude API"],
            [true, "Tu idioma + idioma del estante (país)"],
            [true, "Invitación por código + aprobación"],
            [true, "Seguimiento de solicitudes + cancelar"],
            [true, "Swipe-to-delete con confirmación 2 pasos"],
            [true, "Aceptar/rechazar/eliminar miembros"],
            [true, "Cambio de usuario para testing"],
            [true, "Interfaz en 3 idiomas (en/es/pl)"],
            [true, "Edición de perfil con propagación"],
            [true, "122 iconos emoji (4 idiomas)"],
            [true, "UI optimista — cero bloqueos"],
            [true, "Fallo de traducción + reintentar"],
            [true, "Cantidades y unidades (2kg, 1L, 6x)"],
            [true, "Diccionario local — 96 productos instant"],
            [true, "Duplicados cross-idioma + merge cantidades"],
            [true, "Notas por item"],
            [true, "Tarjeta expandible para añadir (nombre + qty + unidad + nota)"],
            [true, "Editar qty/unidad/nota desde detalle"],
            [true, "Capitalización automática primera letra"],
            [true, "Modo Mostrar — pantalla completa para enseñar al dependiente"],
            [true, "Frases pre-configuradas en Modo Mostrar (6 frases, 12 idiomas)"],
            [true, "Roadmap interactivo dentro de la app"],
            [true, "Reglas inquebrantables visibles en el roadmap"],
            [true, "Confirmación 2 pasos al eliminar desde detalle"],
            [true, "Setup explica 'país = idioma del estante'"],
            [true, "Quién añadió visible en la lista (si otro miembro)"],
            [true, "Badge solicitudes + items pendientes en tarjetas de lista"],
            [true, "Cache de emoji (cero regex tras primer render)"],
            [true, "Grid visual 3 columnas con cards de categoría"],
            [true, "Categorías por pasillo con colores"],
          ]},
          { title: "🔴 MVP — Imprescindible para competir", color: "#ff5c5c", items: [
            [false, "Diccionario 700 productos (500 comida + 200 hogar/farmacia/bricolaje)"],
            [false, "Auto-categorización por pasillo (usando cat de API)"],
            [false, "Autocompletado de productos anteriores (70% es repetitivo)"],
            [false, "Vaciar todos los completados de golpe"],
            [false, "Modo compra: estante GRANDE, tu idioma pequeño, checkbox enorme"],
            [false, "Export bilingüe para WhatsApp (lista en 2 idiomas)"],
            [true, "Añadir en bloque — pegar WhatsApp, separar en items"],
            [false, "Verificar membresía al abrir/añadir/marcar"],
            [false, "Diccionario fuzzy (plurales: uova→uovo, jajka→jajko)"],
            [false, "Prioridad match diccionario (exacto > parcial > API)"],
            [true, "Renombrar listas"],
            [false, "Buscar dentro de una lista"],
          ]},
          { title: "🟡 v2.1 — Mejor experiencia", color: "#e8c364", items: [
            [false, "Onboarding: 'Escribe en tu idioma, compra en cualquier país'"],
            [false, "Lista demo sin registro"],
            [false, "Input por voz multilingüe (Web Speech API — detecta idioma)"],
            [false, "Asignar items a personas (cambia qué traducción es prioritaria)"],
            [false, "Quién compró qué (checkedBy — paso 1 a dividir gastos)"],
            [false, "Sugerencias predictivas en tu idioma ('¿Necesitas leche?')"],
            [false, "Re-traducir items cuando se une nuevo miembro"],
            [false, "Categorías no-alimentarias (🔨 bricolaje, 💊 farmacia, 🔌 electrónica, 🛋️ hogar)"],
            [false, "Listas con tipo de tienda (super, IKEA, Leroy Merlin, farmacia)"],
            [false, "Iconos emoji para categorías no-alimentarias"],
            [false, "Mover/copiar items entre listas"],
            [false, "Modo emergencia — buscar palabra y ver traducción al instante"],
            [false, "Cantidades inteligentes ('medio kilo' → 0.5kg)"],
            [false, "'Comprado' vs 'Ya no lo quiero' al marcar"],
            [false, "Web Share API → compartir directo a WhatsApp/Telegram"],
            [false, "Indicador 'X items nuevos' / última actualización"],
            [false, "Aceptar todas las solicitudes a la vez"],
            [false, "Unidades: cl, dl, boîtes, Stück, latas, sztuk"],
            [false, "Interfaz en fr/de/it/pt"],
            [false, "Accesibilidad: fuente grande / alto contraste"],
            [false, "Notificación transferencia de propiedad"],
            [false, "Strings de tiempo traducidos ('hace 5m')"],
            [false, "PWA — instalar desde navegador, icono en home screen"],
          ]},
          { title: "🔵 v2.2 — Técnico + monetización", color: "#6c8aff", items: [
            [false, "Monetización: Free (50 trad API/mes) + Pro €2/mes (ilimitado + modo compra)"],
            [false, "Cache automático de traducciones API (cada traducción alimenta el diccionario)"],
            [false, "Rate limit traducciones (máx 3 concurrentes)"],
            [false, "Diccionario 2.000 productos (cache orgánico de usuarios reales)"],
            [false, "Export/import completo (CSV + JSON) — te vas y vuelves con todo"],
            [false, "Re-traducir al cambiar idioma propio"],
            [false, "Publicar APK en Google Play (Capacitor/TWA)"],
            [false, "Publicar en App Store iOS (Capacitor)"],
          ]},
          { title: "🟣 v3 — El sueño", color: "#c76dff", items: [
            [false, "Modo offline (service worker + caché)"],
            [false, "Sync real-time (WebSocket)"],
            [false, "Notificaciones push"],
            [false, "Diccionario 5.000+ productos en 15 idiomas (coste API → casi cero)"],
            [false, "Múltiples tiendas (cada tienda = idioma de estante diferente)"],
            [false, "Recetas → lista traducida (receta en FR, lista en PL para el estante)"],
            [false, "Despensa multilingüe (diccionario vivo del hogar)"],
            [false, "Escaneo código de barras"],
            [false, "Reconocimiento de imagen → producto"],
            [false, "Escanear ticket → items + precios"],
            [false, "Layout por tienda (Biedronka vs Lidl)"],
            [false, "Precios por tienda a lo largo del tiempo"],
            [false, "Etiquetas dietéticas (sin gluten, vegano)"],
            [false, "Alternativas (¿no hay X? prueba Y)"],
            [false, "Modo presupuesto (límite + total)"],
            [false, "Reparto de gastos (quién pagó qué)"],
            [false, "Comentarios por item (mini-chat)"],
            [false, "Plantillas recurrentes (compra semanal base)"],
            [false, "Historial de compras por fecha"],
            [false, "Sugerencia inteligente ('¿Leche? Llevas 8 días')"],
            [false, "BabelCart for Teams — residencias/coliving (€5/mes)"],
            [false, "API del diccionario — licenciar traducciones a terceros"],
            [false, "Partnership supermercados — catálogos traducidos"],
            [false, "App nativa (React Native / Flutter)"],
            [false, "Tema claro/oscuro"],
            [false, "Arrastrar para reordenar items"],
          ]},
        ].map((section, si) => {
          let counter = 0;
          return (
          <div key={si} className="mb-3">
            <button
              onClick={() => setCollapsed(p => ({ ...p, [`rm-${si}`]: !p[`rm-${si}`] }))}
              className="flex items-center gap-2 w-full text-left cursor-pointer mb-1"
            >
              <span className="text-[9px]" style={{ transform: collapsed[`rm-${si}`] ? "" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
              <span className="text-xs font-bold" style={{ color: section.color }}>{section.title}</span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: section.color, background: `${section.color}15` }}>{section.items.length}</span>
            </button>
            {!collapsed[`rm-${si}`] && section.items.map(([done, text], i) => {
              counter++;
              return (
              <div key={i} className="flex items-start gap-2 py-0.5 text-[13px]" style={{ color: done ? "#555d74" : "#8b92a8" }}>
                <span className="text-[10px] min-w-[22px] text-right text-text-muted opacity-40 mt-0.5">{counter}</span>
                <span className="text-[11px] mt-0.5 shrink-0">{done ? "✅" : "○"}</span>
                <span style={{ textDecoration: done ? "line-through" : "none" }}>{text as string}</span>
              </div>
              );
            })}
          </div>
          );
        })}
        <button onClick={() => setShowRoadmap(false)} className="w-full mt-3 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
      </Modal>
    </div>
  );
}
