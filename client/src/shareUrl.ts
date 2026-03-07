import type { Roadmap } from './types'

const PARAM = 'r'

export function getSharedParam(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

export async function decodeSharedRoadmap(encoded: string): Promise<Roadmap | null> {
  try {
    const [{ decompressFromEncodedURIComponent }, { RoadmapSchema }] = await Promise.all([
      import('lz-string'),
      import('./schemas'),
    ])
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const result = RoadmapSchema.safeParse(JSON.parse(json))
    return result.success ? (result.data as Roadmap) : null
  } catch {
    return null
  }
}

export async function buildShareUrl(roadmap: Roadmap): Promise<string> {
  const { compressToEncodedURIComponent } = await import('lz-string')
  const encoded = compressToEncodedURIComponent(JSON.stringify(roadmap))
  const url = new URL(window.location.href)
  url.search = `?${PARAM}=${encoded}`
  url.hash = ''
  return url.toString()
}
