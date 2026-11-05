import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { Menu } from "@xts/api-contracts";
import { GET_MENUS } from "./menu.queries";
import { flattenMenus } from "./menu.utils";

export function useMenus() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ menus: Menu[] }>(GET_MENUS, { fetchPolicy: "cache-and-network" });
  const menus = useMemo(() => data?.menus ?? [], [data]);
  const rows = useMemo(() => flattenMenus(menus), [menus]);

  // Only "loading" while there is nothing to show yet (not during a background refresh).
  return { menus, rows, loading: loading && data === undefined, error };
}
