"use client"

import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/** false during SSR and hydration, true afterwards — without a setState-in-effect. */
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
