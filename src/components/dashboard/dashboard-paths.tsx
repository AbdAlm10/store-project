"use client";

import { createContext, useContext } from "react";

export type DashboardPaths = {
  base: string;
  /** Demo marketing nav includes the sample orders page. */
  orders: boolean;
};

const DashboardPathsContext = createContext<DashboardPaths>({
  base: "/dashboard",
  orders: false,
});

export function DashboardPathsProvider({
  value,
  children,
}: {
  value: DashboardPaths;
  children: React.ReactNode;
}) {
  return (
    <DashboardPathsContext.Provider value={value}>{children}</DashboardPathsContext.Provider>
  );
}

export function useDashboardPaths(): DashboardPaths {
  return useContext(DashboardPathsContext);
}
