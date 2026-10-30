import { useState } from "react";

export const PAGE_SIZE = 20;

// Shows `pageSize` items, then "Ver más" adds another page.
export function useShowMore<T>(items: T[], resetKey: string, pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, count: pageSize });
  const count = state.key === resetKey ? state.count : pageSize;
  return {
    visible: items.slice(0, count),
    remaining: Math.max(0, items.length - count),
    more: () => setState({ key: resetKey, count: count + pageSize }),
  };
}

