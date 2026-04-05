// Items-view layout contract. Every layout component in
// src/layouts/items/registry.tsx implements this interface, so the parent
// (ListDetailPage or the admin preview) can swap them interchangeably.

import type { Item, ListMember } from "../../lib/supabase";

export interface ItemsLayoutProps {
  items: Item[];
  members: ListMember[];
  userLang: string;
  shelfLang: string;
  onToggle: (id: string, checked: boolean) => void;
  onClick: (item: Item) => void;
  /** When true, the layout is being rendered inside an admin preview (smaller
   *  viewport, no real interactions). Layouts can use this to shrink fonts,
   *  drop scroll containers, etc. */
  preview?: boolean;
}

export interface ItemsLayout {
  id: string;
  name: string;
  tag: string;
  Component: React.ComponentType<ItemsLayoutProps>;
}

// Helpers used by every layout
export function displayNameOf(item: Item, lang: string): string {
  return item.translations?.[lang] || item.original;
}

export function shelfNameOf(item: Item, shelfLang: string): string {
  return item.translations?.[shelfLang] || item.original;
}

export function qtyLabelOf(item: Item): string {
  if (!item.qty && !item.unit) return "";
  if (item.qty && item.unit) return `${item.qty}${item.unit}`;
  if (item.qty) return `×${item.qty}`;
  return item.unit || "";
}
