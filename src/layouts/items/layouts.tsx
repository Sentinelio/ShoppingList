// Twenty complete items-view layouts. Each is a self-contained component that
// renders the whole list. Ported from the v5 HTML mockup.
//
// All layouts share the same ItemsLayoutProps interface so ListDetailPage can
// swap between them at runtime based on the admin's theme selection. Shared
// styling lives in ./layouts.css.
/* eslint-disable react-refresh/only-export-components */

import { Fragment } from "react";
import type { Item } from "../../lib/supabase";
import { getCategoryColor, getCategoryEmoji, CATEGORIES } from "../../data/categories";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { displayNameOf, qtyLabelOf, shelfNameOf, type ItemsLayoutProps } from "./types";
import "./layouts.css";

// ── Shared helpers ─────────────────────────────────────────────────────────

function itemEmoji(item: Item): string {
  const { emoji } = matchProductEmoji(item.original);
  return emoji || getCategoryEmoji(item.category || "other") || "🛒";
}

function categoryLabel(cat: string, lang: string): string {
  const c = CATEGORIES[cat] ?? CATEGORIES.other;
  return (c as unknown as Record<string, string>)[lang] || c.en;
}

function groupByCategory(items: Item[]) {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.category || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  return Array.from(groups.entries());
}

function groupByMember(items: Item[]) {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.added_by_name || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  return Array.from(groups.entries());
}

function onClickItem(e: React.MouseEvent, item: Item, onClick: (i: Item) => void) {
  e.stopPropagation();
  onClick(item);
}

// ── 1. Aisle Walk ──────────────────────────────────────────────────────────
function AisleWalk({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  const groups = groupByCategory(items);
  return (
    <div className="layout-aisle">
      {groups.map(([cat, its], gi) => {
        const color = getCategoryColor(cat);
        return (
          <Fragment key={cat}>
            <div className="aisle-marker" style={{ color }}>
              <span className="aisle-marker-dot" style={{ borderColor: color }} />
              {getCategoryEmoji(cat)} {categoryLabel(cat, userLang)}
            </div>
            {its.map((it, ii) => (
              <button
                key={it.id}
                type="button"
                onClick={e => onClickItem(e, it, onClick)}
                className={`aisle-item ${it.important ? "babelcart-important-text" : ""}`}
                style={{ marginTop: gi === 0 && ii === 0 ? 0 : undefined }}
              >
                <span className="aisle-em">{itemEmoji(it)}</span>
                <span className="aisle-nm">{displayNameOf(it, userLang)}</span>
                {shelfLang !== userLang && (
                  <span className="aisle-sh">{shelfNameOf(it, shelfLang)}</span>
                )}
              </button>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── 2. Card Grid ───────────────────────────────────────────────────────────
function CardGrid({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-cardgrid">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`cardgrid-item ${it.important ? "babelcart-important" : ""}`}
          style={{ borderColor: getCategoryColor(it.category || "other") + "33" }}
        >
          <div className="cardgrid-em">{itemEmoji(it)}</div>
          <div className="cardgrid-nm">{displayNameOf(it, userLang)}</div>
          {shelfLang !== userLang && (
            <div className="cardgrid-sh">{shelfNameOf(it, shelfLang)}</div>
          )}
          {qtyLabelOf(it) && <div className="cardgrid-qt">{qtyLabelOf(it)}</div>}
        </button>
      ))}
    </div>
  );
}

// ── 3. Chat Bubbles ────────────────────────────────────────────────────────
function ChatBubbles({ items, members, userLang, onClick }: ItemsLayoutProps) {
  const groups = groupByMember(items);
  const memberLang = (name: string) =>
    members.find(m => m.user_name === name)?.user_lang || "en";
  // Current user is on the right — pick the most frequent author as "us" for
  // the preview, otherwise use the first member.
  const rightSide = groups[0]?.[0] ?? "";
  return (
    <div className="layout-chat">
      {groups.map(([name, its], i) => {
        const side = name === rightSide ? "manu" : "kasia";
        const lang = memberLang(name);
        return (
          <div key={i} className={`chat-msg chat-msg-${side}`}>
            <div className="chat-who">{lang.toUpperCase()} · {name}</div>
            <div className="chat-items">
              {its.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={e => onClickItem(e, it, onClick)}
                  className="chat-line"
                >
                  <span className="chat-em">{itemEmoji(it)}</span>
                  <span className={it.important ? "babelcart-important-text" : ""}>
                    {displayNameOf(it, userLang)}
                    {it.important && <span className="imp-dot-right" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Compact Chips ───────────────────────────────────────────────────────
function CompactChips({ items, userLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-chips">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`chip ${it.checked ? "chip-done" : ""} ${it.important ? "babelcart-important" : ""}`}
        >
          <span className="chip-em">{itemEmoji(it)}</span>
          {displayNameOf(it, userLang)}
        </button>
      ))}
    </div>
  );
}

// ── 5. Hero Cards ──────────────────────────────────────────────────────────
function HeroCards({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-hero">
      {items.map(it => {
        const color = getCategoryColor(it.category || "other");
        return (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            className={`hero-card ${it.important ? "babelcart-important" : ""}`}
          >
            <div className="hero-em" style={{ background: `${color}1a` }}>
              {itemEmoji(it)}
            </div>
            <div className="hero-info">
              <div className="hero-nm">{displayNameOf(it, userLang)}</div>
              {shelfLang !== userLang && (
                <div className="hero-sh">
                  {shelfNameOf(it, shelfLang)}
                  {qtyLabelOf(it) && ` · ${qtyLabelOf(it)}`}
                </div>
              )}
              {it.added_by_name && (
                <div className="hero-meta">added by {it.added_by_name}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── 6. Horizontal Scroll per category ──────────────────────────────────────
function HScroll({ items, userLang, onClick }: ItemsLayoutProps) {
  const groups = groupByCategory(items);
  return (
    <div className="layout-hscroll">
      {groups.map(([cat, its]) => (
        <div key={cat} className="hscroll-section">
          <div className="hscroll-label">{getCategoryEmoji(cat)} {categoryLabel(cat, userLang)}</div>
          <div className="hscroll-row">
            {its.map(it => (
              <button
                key={it.id}
                type="button"
                onClick={e => onClickItem(e, it, onClick)}
                className={`hscroll-item ${it.important ? "babelcart-important" : ""}`}
              >
                <div className="hscroll-em">{itemEmoji(it)}</div>
                {displayNameOf(it, userLang)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 7. Timeline / chronological ────────────────────────────────────────────
function Timeline({ items, userLang, onClick }: ItemsLayoutProps) {
  const sorted = [...items].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return (
    <div className="layout-timeline">
      {sorted.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`tl-item ${it.checked ? "tl-done" : ""} ${it.important ? "babelcart-important" : ""}`}
        >
          <div className="tl-name">{itemEmoji(it)} {displayNameOf(it, userLang)}</div>
          {it.added_by_name && <div className="tl-by">{it.added_by_name}</div>}
        </button>
      ))}
    </div>
  );
}

// ── 8. Masonry ─────────────────────────────────────────────────────────────
function Masonry({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-masonry">
      {items.map(it => {
        const color = getCategoryColor(it.category || "other");
        return (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            className={`m-card ${it.important ? "babelcart-important" : ""}`}
            style={{ background: `${color}14`, borderColor: `${color}33` }}
          >
            <div className="m-em">{itemEmoji(it)}</div>
            <div className="m-nm">{displayNameOf(it, userLang)}</div>
            {shelfLang !== userLang && (
              <div className="m-sh">{shelfNameOf(it, shelfLang)}</div>
            )}
            {it.note && <div className="m-note">{it.note}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ── 9. Minimal Text ────────────────────────────────────────────────────────
function MinimalText({ items, userLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-minimal">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`min-item ${it.checked ? "min-done" : ""} ${it.important ? "babelcart-important" : ""}`}
        >
          <span className="min-nm">{displayNameOf(it, userLang)}</span>
          <span className="min-qt">{qtyLabelOf(it)}</span>
        </button>
      ))}
    </div>
  );
}

// ── 10. Photo Cards ────────────────────────────────────────────────────────
function PhotoCards({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-photo">
      {items.map(it => {
        const color = getCategoryColor(it.category || "other");
        return (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            className={`photo-card ${it.important ? "babelcart-important" : ""}`}
          >
            <div className="ph" style={{ background: `${color}14` }}>
              {it.photo ? <img src={it.photo} alt={displayNameOf(it, userLang)} /> : itemEmoji(it)}
            </div>
            <div className="ph-info">
              <div className="ph-nm">{displayNameOf(it, userLang)}</div>
              {shelfLang !== userLang && (
                <div className="ph-sh">
                  {shelfNameOf(it, shelfLang)}
                  {qtyLabelOf(it) && ` · ${qtyLabelOf(it)}`}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── 11. Swipeable Stack (shows the top card) ───────────────────────────────
function SwipeableStack({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  const top = items.slice(0, 3);
  return (
    <div className="layout-stack">
      {top.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={e => i === 0 && onClickItem(e, it, onClick)}
          className={`s-card s-card-${i} ${it.important && i === 0 ? "babelcart-important" : ""}`}
          disabled={i !== 0}
        >
          <div className="s-em">{itemEmoji(it)}</div>
          <div className="s-nm">{displayNameOf(it, userLang)}</div>
          {shelfLang !== userLang && (
            <div className="s-sh">{shelfNameOf(it, shelfLang)}{qtyLabelOf(it) && ` · ${qtyLabelOf(it)}`}</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ── 12. Color Bars ─────────────────────────────────────────────────────────
function ColorBars({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-colorbars">
      {items.map(it => {
        const color = getCategoryColor(it.category || "other");
        return (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            className={`cbar ${it.checked ? "cbar-done" : ""} ${it.important ? "babelcart-important" : ""}`}
            style={{ background: `${color}10`, borderColor: `${color}28` }}
          >
            <span className="cbar-stripe" style={{ background: color }} />
            <span className="cbar-em">{itemEmoji(it)}</span>
            <span className="cbar-nm">{displayNameOf(it, userLang)}</span>
            {shelfLang !== userLang && (
              <span className="cbar-sh" style={{ color }}>{shelfNameOf(it, shelfLang)}</span>
            )}
            <span className="cbar-qt">{qtyLabelOf(it)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── 13. Split Bilingual ────────────────────────────────────────────────────
function SplitBilingual({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-bilingual">
      <div className="bi-head">
        <span />
        <span>{userLang.toUpperCase()}</span>
        <span>{shelfLang.toUpperCase()}</span>
      </div>
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`bi-item ${it.important ? "babelcart-important" : ""}`}
        >
          <span className="bi-em">{itemEmoji(it)}</span>
          <span className="bi-mine">{displayNameOf(it, userLang)}</span>
          <span className="bi-shelf">{shelfNameOf(it, shelfLang)}</span>
        </button>
      ))}
    </div>
  );
}

// ── 14. Dense Table ────────────────────────────────────────────────────────
function DenseTable({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  return (
    <table className="layout-dense">
      <thead>
        <tr>
          <th />
          <th>Product</th>
          <th>Shelf</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        {items.map(it => (
          <tr
            key={it.id}
            onClick={e => onClickItem(e, it, onClick)}
            className={`${it.checked ? "dense-done" : ""} ${it.important ? "babelcart-important" : ""}`}
          >
            <td className="dense-em">{itemEmoji(it)}</td>
            <td>{displayNameOf(it, userLang)}</td>
            <td className="dense-sh">{shelfLang !== userLang ? shelfNameOf(it, shelfLang) : ""}</td>
            <td className="dense-qt">{qtyLabelOf(it)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 15. Accordion by category ──────────────────────────────────────────────
function Accordion({ items, userLang, onClick }: ItemsLayoutProps) {
  const groups = groupByCategory(items);
  return (
    <div className="layout-accordion">
      {groups.map(([cat, its]) => {
        const color = getCategoryColor(cat);
        return (
          <details key={cat} open className="acc-section">
            <summary className="acc-head">
              {getCategoryEmoji(cat)} {categoryLabel(cat, userLang)}
              <span className="acc-count">{its.length}</span>
            </summary>
            <div className="acc-items">
              {its.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={e => onClickItem(e, it, onClick)}
                  className="acc-item"
                >
                  <span className="acc-dot" style={{ background: color }} />
                  <span className={it.important ? "babelcart-important-text" : ""}>
                    {displayNameOf(it, userLang)}
                    {it.important && <span className="imp-dot-right" />}
                  </span>
                </button>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ── 16. Progress Dashboard ─────────────────────────────────────────────────
function ProgressDash({ items, members, userLang, onClick }: ItemsLayoutProps) {
  const total = items.length || 1;
  const done = items.filter(i => i.checked).length;
  const pct = Math.round((done / total) * 100);
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="layout-progress">
      <div className="ring-wrap">
        <svg viewBox="0 0 120 120">
          <circle className="ring-bg" cx="60" cy="60" r="50" />
          <circle
            className="ring-fg"
            cx="60"
            cy="60"
            r="50"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-pct">{pct}%</div>
          <div className="ring-label">bought</div>
        </div>
      </div>
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-n" style={{ color: "var(--color-accent, #f0883e)" }}>{total - done}</div>
          <div className="dash-l">Pending</div>
        </div>
        <div className="dash-stat">
          <div className="dash-n" style={{ color: "#3dd68c" }}>{done}</div>
          <div className="dash-l">Bought</div>
        </div>
        <div className="dash-stat">
          <div className="dash-n" style={{ color: "#6c8aff" }}>{members.length}</div>
          <div className="dash-l">People</div>
        </div>
      </div>
      <div className="dash-list">
        {items.map(it => (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            className={`dash-item ${it.checked ? "dash-done" : ""}`}
          >
            <span className="dash-em">{itemEmoji(it)}</span>
            <span className={`dash-nm ${it.important ? "babelcart-important-text" : ""}`}>
              {displayNameOf(it, userLang)}
              {it.important && <span className="imp-dot-right" />}
            </span>
            {it.checked && <span className="dash-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 17. Grouped by Person ──────────────────────────────────────────────────
function GroupedByPerson({ items, members, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  const groups = groupByMember(items);
  const palette = ["#6c8aff", "#f0883e", "#3dd68c", "#c76dff", "#e8c364"];
  return (
    <div className="layout-person">
      {groups.map(([name, its], i) => {
        const m = members.find(mm => mm.user_name === name);
        const color = palette[i % palette.length];
        return (
          <div key={name} className="person-section">
            <div className="person-head">
              <div className="person-avatar" style={{ background: color }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="person-name">{name}</span>
              {m?.user_lang && <span className="person-lang">{m.user_lang}</span>}
              <span className="person-count">{its.length} items</span>
            </div>
            <div className="person-items">
              {its.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={e => onClickItem(e, it, onClick)}
                  className="pi"
                >
                  <span className="pi-em">{itemEmoji(it)}</span>
                  <span className={`pi-nm ${it.important ? "babelcart-important-text" : ""}`}>
                    {displayNameOf(it, userLang)}
                    {it.important && <span className="imp-dot-right" />}
                  </span>
                  {shelfLang !== userLang && (
                    <span className="pi-sh">{shelfNameOf(it, shelfLang)}</span>
                  )}
                  {qtyLabelOf(it) && <span className="pi-qt">{qtyLabelOf(it)}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 18. Magazine Editorial ─────────────────────────────────────────────────
function Magazine({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  const [feat, ...rest] = items.filter(i => !i.checked);
  return (
    <div className="layout-magazine">
      {feat && (
        <button
          type="button"
          onClick={e => onClickItem(e, feat, onClick)}
          className={`m-feat ${feat.important ? "babelcart-important" : ""}`}
        >
          <div className="m-feat-em">{itemEmoji(feat)}</div>
          <div>
            <div className="m-feat-nm">{displayNameOf(feat, userLang)}</div>
            {shelfLang !== userLang && (
              <div className="m-feat-sh">
                {shelfNameOf(feat, shelfLang)}
                {qtyLabelOf(feat) && ` · ${qtyLabelOf(feat)}`}
              </div>
            )}
          </div>
        </button>
      )}
      {rest.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`m-sm ${it.important ? "babelcart-important" : ""}`}
        >
          <div className="m-sm-em">{itemEmoji(it)}</div>
          <div>
            <div className="m-sm-nm">{displayNameOf(it, userLang)}</div>
            {shelfLang !== userLang && (
              <div className="m-sm-sh">{shelfNameOf(it, shelfLang)}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── 19. Sticky Notes ───────────────────────────────────────────────────────
function StickyNotes({ items, userLang, onClick }: ItemsLayoutProps) {
  return (
    <div className="layout-sticky">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className={`sticky sticky-${i % 6} ${it.important ? "babelcart-important" : ""}`}
        >
          <div className="sticky-em">{itemEmoji(it)}</div>
          <div className="sticky-nm">{displayNameOf(it, userLang)}</div>
        </button>
      ))}
    </div>
  );
}

// ── 20. Terminal ───────────────────────────────────────────────────────────
function Terminal({ items, userLang, shelfLang, onClick }: ItemsLayoutProps) {
  const done = items.filter(i => i.checked);
  const pending = items.filter(i => !i.checked);
  return (
    <div className="layout-terminal">
      <div className="term-bar">
        <span className="term-dot" style={{ background: "#ff5f56" }} />
        <span className="term-dot" style={{ background: "#ffbd2e" }} />
        <span className="term-dot" style={{ background: "#27c93f" }} />
      </div>
      <div className="term-line">
        <span className="term-cmd">$</span> babelcart list
      </div>
      <div className="term-blank" />
      {done.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className="term-line term-item"
        >
          <span className="term-check">✓</span>{" "}
          <span className="term-done">{displayNameOf(it, userLang)}</span>
        </button>
      ))}
      {pending.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={e => onClickItem(e, it, onClick)}
          className="term-line term-item"
        >
          ○{" "}
          <span className={`term-val ${it.important ? "babelcart-important-text" : ""}`}>
            {displayNameOf(it, userLang)}
            {it.important && <span className="imp-dot-right" />}
          </span>
          {shelfLang !== userLang && (
            <span className="term-flag"> → {shelfNameOf(it, shelfLang)}</span>
          )}
        </button>
      ))}
      <div className="term-blank" />
      <div className="term-footer">
        {pending.length} pending · {done.length} done
      </div>
    </div>
  );
}

// ── Classic (3-col grid, original app design) ─────────────────────────────
// Not actually rendered inline in ListDetailPage (the parent handles it with
// category groups and checked sections) — this component is only used by the
// admin themes preview to show a thumbnail of the default look.
function ClassicGridPreview({ items, userLang, onClick }: ItemsLayoutProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 12px" }}>
      {items.slice(0, 6).map(it => {
        const color = getCategoryColor(it.category || "other");
        return (
          <button
            key={it.id}
            type="button"
            onClick={e => onClickItem(e, it, onClick)}
            style={{
              padding: "14px 6px 10px",
              background: `${color}26`,
              border: `1px solid ${color}40`,
              borderRadius: 16,
              color: "var(--color-text, #e6e8ee)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, lineHeight: 1 }}>{itemEmoji(it)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{displayNameOf(it, userLang)}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Registry ───────────────────────────────────────────────────────────────

import type { ItemsLayout } from "./types";

export const ITEMS_LAYOUTS: ItemsLayout[] = [
  { id: "items-classic",   name: "Classic Grid",      tag: "default · 3-col grouped", Component: ClassicGridPreview },
  { id: "items-aisle",     name: "Aisle Walk",        tag: "store-style",  Component: AisleWalk },
  { id: "items-cardgrid",  name: "Card Grid",         tag: "2-col grid",   Component: CardGrid },
  { id: "items-chat",      name: "Chat Bubbles",      tag: "collaborative", Component: ChatBubbles },
  { id: "items-chips",     name: "Compact Chips",     tag: "flow wrap",    Component: CompactChips },
  { id: "items-hero",      name: "Hero Cards",        tag: "accessibility", Component: HeroCards },
  { id: "items-hscroll",   name: "Horizontal Scroll", tag: "per category", Component: HScroll },
  { id: "items-timeline",  name: "Timeline",          tag: "chronological", Component: Timeline },
  { id: "items-masonry",   name: "Masonry",           tag: "varied sizes", Component: Masonry },
  { id: "items-minimal",   name: "Minimal Text",      tag: "ultra clean",  Component: MinimalText },
  { id: "items-photo",     name: "Photo Cards",       tag: "visual-first", Component: PhotoCards },
  { id: "items-stack",     name: "Swipeable Stack",   tag: "one at a time", Component: SwipeableStack },
  { id: "items-colorbars", name: "Color Bars",        tag: "scannable",    Component: ColorBars },
  { id: "items-bilingual", name: "Split Bilingual",   tag: "two columns",  Component: SplitBilingual },
  { id: "items-dense",     name: "Dense Table",       tag: "data-heavy",   Component: DenseTable },
  { id: "items-accordion", name: "Accordion",         tag: "collapsible",  Component: Accordion },
  { id: "items-progress",  name: "Progress Dashboard", tag: "gamification", Component: ProgressDash },
  { id: "items-person",    name: "Grouped by Person", tag: "collaborative", Component: GroupedByPerson },
  { id: "items-magazine",  name: "Magazine",          tag: "featured",     Component: Magazine },
  { id: "items-sticky",    name: "Sticky Notes",      tag: "post-it",      Component: StickyNotes },
  { id: "items-terminal",  name: "Terminal",          tag: "dev vibes",    Component: Terminal },
];

export const DEFAULT_ITEMS_LAYOUT_ID = "items-classic";

export function getItemsLayout(id: string): ItemsLayout {
  return ITEMS_LAYOUTS.find(l => l.id === id) ?? ITEMS_LAYOUTS[0];
}
