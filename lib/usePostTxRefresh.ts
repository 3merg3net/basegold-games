// lib/usePostTxRefresh.ts
'use client'
import { useEffect } from 'react'
type Refetch = () => void

export function usePostTxRefresh(ok: boolean, ...fns: Refetch[]) {
  useEffect(() => {
    if (!ok) return
    // immediate + slight delay to beat RPC lag
    fns.forEach(fn => fn && fn())
    const t = setTimeout(() => fns.forEach(fn => fn && fn()), 800)
    return () => clearTimeout(t)
  }, [ok]) // eslint-disable-line react-hooks/exhaustive-deps
}
