import type { PhishingScan, ScanResult, ScanType } from '../types'
import type { UserAnalyticsResponse } from './api'

const STORAGE_KEY = 'phishguard_guest_scans_v1'
const UPDATE_EVENT = 'phishguard:guest-scans-updated'

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function getNowIso() {
  return new Date().toISOString()
}

function createId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}

export function getGuestScans(): PhishingScan[] {
  const parsed = safeJsonParse<PhishingScan[]>(localStorage.getItem(STORAGE_KEY))
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      id: String((s as any).id ?? createId()),
      userId: String((s as any).userId ?? 'guest'),
      scanType: (s as any).scanType as ScanType,
      content: String((s as any).content ?? ''),
      threatLevel: (s as any).threatLevel,
      confidence: Number((s as any).confidence ?? 0),
      indicators: Array.isArray((s as any).indicators) ? (s as any).indicators : [],
      analysis: String((s as any).analysis ?? ''),
      createdAt: String((s as any).createdAt ?? getNowIso()),
    }))
    .filter((s) => ['url', 'link', 'email', 'sms', 'qr'].includes(s.scanType))
}

export function setGuestScans(scans: PhishingScan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function addGuestScan(params: {
  scanType: ScanType
  content: string
  result: ScanResult
}) {
  const scan: PhishingScan = {
    id: createId(),
    userId: 'guest',
    scanType: params.scanType,
    content: params.content,
    threatLevel: params.result.threatLevel,
    confidence: params.result.confidence,
    indicators: params.result.indicators,
    analysis: params.result.analysis,
    createdAt: getNowIso(),
  }

  const existing = getGuestScans()
  const next = [scan, ...existing].slice(0, 50)
  setGuestScans(next)
}

export function clearGuestScans() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function onGuestScansUpdated(handler: () => void) {
  window.addEventListener(UPDATE_EVENT, handler)
  return () => window.removeEventListener(UPDATE_EVENT, handler)
}

export function computeGuestAnalytics(scans: PhishingScan[]): UserAnalyticsResponse['analytics'] {
  const totalScans = scans.length
  const threatCounts = {
    safe: 0,
    suspicious: 0,
    dangerous: 0,
  }
  const scanTypeCounts = {
    url: 0,
    email: 0,
    sms: 0,
    qr: 0,
  } as Record<string, number>

  let totalConfidence = 0

  for (const scan of scans) {
    if (scan.threatLevel === 'safe') threatCounts.safe += 1
    if (scan.threatLevel === 'suspicious') threatCounts.suspicious += 1
    if (scan.threatLevel === 'dangerous') threatCounts.dangerous += 1

    scanTypeCounts[scan.scanType] += 1
    totalConfidence += Number(scan.confidence) || 0
  }

  const averageConfidence = totalScans > 0 ? totalConfidence / totalScans : 0
  const threatDistribution = {
    safe: totalScans > 0 ? Math.round((threatCounts.safe / totalScans) * 100) : 0,
    suspicious: totalScans > 0 ? Math.round((threatCounts.suspicious / totalScans) * 100) : 0,
    dangerous: totalScans > 0 ? Math.round((threatCounts.dangerous / totalScans) * 100) : 0,
  }

  const recentScans = scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    scanType: scan.scanType,
    threatLevel: scan.threatLevel,
    confidence: scan.confidence,
    createdAt: scan.createdAt,
  }))

  const scansByDate: Record<string, number> = {}
  for (const scan of scans) {
    const date = new Date(scan.createdAt).toISOString().split('T')[0]
    scansByDate[date] = (scansByDate[date] || 0) + 1
  }
  const trendData = Object.entries(scansByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalScans,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    threatCounts,
    threatDistribution,
    scanTypeCounts,
    recentScans,
    trendData,
    lastScanDate: scans[0]?.createdAt ?? null,
  }
}
