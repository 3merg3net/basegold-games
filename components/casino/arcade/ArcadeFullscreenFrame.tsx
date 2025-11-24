'use client'

import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

type ArcadeFullscreenFrameProps = PropsWithChildren<{
  title: string
  subtitle?: string
}>

export default function ArcadeFullscreenFrame({
  title,
  subtitle,
  children,
}: ArcadeFullscreenFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // keep local state in sync if user exits fullscreen with OS gesture
 useEffect(() => {
  function onChange() {
    const fsElement =
      document.fullscreenElement ||
      // @ts-ignore legacy iOS (still harmless)
      document.webkitFullscreenElement;

    setIsFullscreen(!!fsElement);
  }

  document.addEventListener('fullscreenchange', onChange);
  // still add webkit event for older mobile Safari, but don't mark as error
  // @ts-ignore
  document.addEventListener('webkitfullscreenchange', onChange);

  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    // @ts-ignore
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}, []);


  const requestFs = useCallback(async () => {
    if (!containerRef.current) return
    const el = containerRef.current as any

    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
      setIsFullscreen(true)
    } catch (e) {
      console.error('Fullscreen request failed', e)
    }
  }, [])

  const exitFs = useCallback(async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen()
      // @ts-expect-error webkit
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      // @ts-expect-error moz
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen()
      setIsFullscreen(false)
    } catch (e) {
      console.error('Exit fullscreen failed', e)
    }
  }, [])

  const toggleFs = useCallback(() => {
    if (isFullscreen) exitFs()
    else requestFs()
  }, [isFullscreen, exitFs, requestFs])

  return (
    <div
      ref={containerRef}
      className={[
        'relative rounded-[28px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#020617] shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden',
        // when fullscreen, let the wrapper own the viewport on mobile
        'max-h-[calc(100vh-1.5rem)]',
      ].join(' ')}
    >
      {/* Top bar: title + fullscreen toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/60">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#fde68a]/80">
            Base Gold Rush
          </div>
          <div className="text-xs sm:text-sm font-semibold text-white truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] text-white/60 truncate">
              {subtitle}
            </div>
          )}
        </div>

        <button
          onClick={toggleFs}
          className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-white/10"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-[4px] border border-white/70" />
          <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>

      {/* Content area – your cabinet goes here */}
      <div className="p-2 sm:p-3 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
