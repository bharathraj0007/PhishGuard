export type ScanType = 'link' | 'email' | 'sms' | 'qr'

export type ThreatLevel = 'safe' | 'suspicious' | 'dangerous'

export interface PhishingScan {
  id: string
  userId: string
  scanType: ScanType
  content: string
  threatLevel: ThreatLevel
  confidence: number
  indicators: string[]
  analysis: string
  createdAt: string
}

export interface ScanResult {
  threatLevel: ThreatLevel
  confidence: number
  indicators: string[]
  analysis: string
  recommendations: string[]
}
