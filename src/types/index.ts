export type ScanType = 'url' | 'email' | 'sms' | 'qr'

export type ThreatLevel = 'safe' | 'suspicious' | 'dangerous'

// QR-specific result status for handling decode failures and unsupported content
export type QRResultStatus = 'success' | 'decode_error' | 'unsupported_content'

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
  // QR-specific fields for handling error states
  qrStatus?: QRResultStatus
  qrErrorMessage?: string
}
