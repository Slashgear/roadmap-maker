import { useState } from 'preact/hooks'
import type { Roadmap } from '../types'

async function captureChart() {
  const outer = document.getElementById('main-chart')?.firstElementChild as HTMLElement | null
  if (!outer) return null
  const scrollDiv = outer.querySelector<HTMLElement>(':scope > div')
  const prevOuter = outer.style.overflow
  const prevScroll = scrollDiv?.style.overflow ?? ''
  outer.style.overflow = 'visible'
  if (scrollDiv) scrollDiv.style.overflow = 'visible'
  return {
    outer,
    scrollDiv,
    w: outer.scrollWidth,
    h: outer.scrollHeight,
    restore() {
      outer.style.overflow = prevOuter
      if (scrollDiv) scrollDiv.style.overflow = prevScroll
    },
  }
}

export function useExport(roadmap: Roadmap | null) {
  const [isExporting, setIsExporting] = useState(false)

  function handleExport() {
    if (!roadmap) return
    const blob = new Blob([JSON.stringify(roadmap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${roadmap.slug}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleExportPng() {
    if (!roadmap || isExporting) return
    setIsExporting(true)
    const capture = await captureChart()
    if (!capture) {
      setIsExporting(false)
      return
    }
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(capture.outer, { pixelRatio: 2, width: capture.w, height: capture.h })
      const a = document.createElement('a')
      a.href = url
      a.download = `${roadmap.slug}-gantt.png`
      a.click()
    } finally {
      capture.restore()
      setIsExporting(false)
    }
  }

  async function handleExportSvg() {
    if (!roadmap || isExporting) return
    setIsExporting(true)
    const capture = await captureChart()
    if (!capture) {
      setIsExporting(false)
      return
    }
    try {
      const { toSvg } = await import('html-to-image')
      const url = await toSvg(capture.outer, { width: capture.w, height: capture.h })
      const a = document.createElement('a')
      a.href = url
      a.download = `${roadmap.slug}-gantt.svg`
      a.click()
    } finally {
      capture.restore()
      setIsExporting(false)
    }
  }

  return { isExporting, handleExport, handleExportPng, handleExportSvg }
}
