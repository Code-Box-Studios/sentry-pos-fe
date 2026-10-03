"use client";

import { useEffect, useState } from "react";
import { crossedDayBoundary } from "@/lib/day-boundary";
import { nowIso } from "@/lib/time";
import { useCatalogStore } from "@/state/catalog";
import { useShiftStore } from "@/state/shift";
import { DayBoundaryBanner } from "./DayBoundaryBanner";

export function OpenShiftDayBoundary() {
  const shift = useShiftStore(s => s.shift);
  const dayStartTime = useCatalogStore(s => s.catalog?.business.dayStartTime);
  const [now, setNow] = useState(nowIso);
  useEffect(() => {
    const refresh = () => setNow(nowIso());
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  if (!shift || !dayStartTime || !crossedDayBoundary(shift.openedAt, dayStartTime, now)) return null;
  return <DayBoundaryBanner dayStartTime={dayStartTime} />;
}
