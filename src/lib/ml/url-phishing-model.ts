/**
 * URL Phishing Detection Model
 * Analyzes URLs extracted from QR codes to detect phishing indicators
 * Part of QR Decoder + URL Model algorithm
 */

export interface URLPhishingAnalysis {
  url: string;
  isPhishing: boolean;
  confidence: number;
  indicators: string[];
  score: number;
  details: {
    domainScore: number;
    pathScore: number;
    parameterScore: number;
    structureScore: number;
  };
}

/**
 * Comprehensive URL phishing detection model
 */
export class URLPhishingModel {
  private suspiciousDomains: Set<string> = new Set([
    'paypai', 'gogle', 'facbook', 'amaz0n', 'apple-id', 'amazone', 'paypa1',
    'yourbank', 'verify-account', 'confirm-identity', 'update-payment'
  ]);

  private brandDomains: Map<string, string[]> = new Map([
    ['google.com', ['accounts.google.com', 'mail.google.com', 'drive.google.com']],
    ['facebook.com', ['m.facebook.com', 'l.facebook.com']],
    ['amazon.com', ['amazon.co.uk', 'amazon.de', 'amazon.fr']],
    ['apple.com', ['icloud.com', 'itunes.apple.com']],
    ['paypal.com', ['paypalobjects.com', 'x.paypal.com']],
    ['microsoft.com', ['outlook.com', 'onedrive.com', 'office.com']]
  ]);

  private commonPhishingKeywords: Set<string> = new Set([
    'verify', 'confirm', 'update', 'validate', 'authenticate', 'authorize',
    'urgent', 'action', 'required', 'click', 'claim', 'prize', 'winner',
    'reset', 'password', 'account', 'security', 'alert', 'warning',
    'suspended', 'limited', 'locked', 'unusual', 'activity', 'check'
  ]);

  /**
   * Analyze URL for phishing indicators
   */
  analyzeURL(url: string): URLPhishingAnalysis {
    try {
      const indicators: string[] = [];
      let score = 0;

      // Parse URL
      let parsedURL: URL;
      try {
        parsedURL = new URL(url);
      } catch (error) {
        return {
          url,
          isPhishing: true,
          confidence: 0.95,
          indicators: ['invalid_url_format'],
          score: 95,
          details: {
            domainScore: 95,
            pathScore: 0,
            parameterScore: 0,
            structureScore: 0
          }
        };
      }

      // Analyze domain
      const domainAnalysis = this.analyzeDomain(parsedURL.hostname);
      score += domainAnalysis.score;
      indicators.push(...domainAnalysis.indicators);

      // Analyze path and suspicious patterns
      const pathAnalysis = this.analyzePath(parsedURL.pathname);
      score += pathAnalysis.score;
      indicators.push(...pathAnalysis.indicators);

      // Analyze query parameters
      const paramAnalysis = this.analyzeParameters(parsedURL.search);
      score += paramAnalysis.score;
      indicators.push(...paramAnalysis.indicators);

      // Analyze overall structure
      const structureAnalysis = this.analyzeStructure(url, parsedURL);
      score += structureAnalysis.score;
      indicators.push(...structureAnalysis.indicators);

      // Normalize score to 0-100
      const normalizedScore = Math.min(100, score);
      const isPhishing = normalizedScore > 50;
      const confidence = Math.abs(normalizedScore - 50) / 50; // Higher certainty at extremes

      return {
        url,
        isPhishing,
        confidence: Math.min(1, confidence),
        indicators: [...new Set(indicators)],
        score: normalizedScore,
        details: {
          domainScore: domainAnalysis.score,
          pathScore: pathAnalysis.score,
          parameterScore: paramAnalysis.score,
          structureScore: structureAnalysis.score
        }
      };
    } catch (error) {
      console.error('URL analysis error:', error);
      return {
        url,
        isPhishing: false,
        confidence: 0.5,
        indicators: ['analysis_error'],
        score: 50,
        details: {
          domainScore: 0,
          pathScore: 0,
          parameterScore: 0,
          structureScore: 0
        }
      };
    }
  }

  /**
   * Analyze domain for phishing indicators
   */
  private analyzeDomain(hostname: string): {score: number; indicators: string[]} {
    const indicators: string[] = [];
    let score = 0;

    // Check for typosquatting
    if (this.isTyposquatting(hostname)) {
      indicators.push('typosquatting_detected');
      score += 25;
    }

    // Check for suspicious TLD
    if (this.hasSuspiciousTLD(hostname)) {
      indicators.push('suspicious_tld');
      score += 15;
    }

    // Check for IP address instead of domain
    if (this.isIPAddress(hostname)) {
      indicators.push('ip_address_used');
      score += 20;
    }

    // Check for homograph attacks (Unicode characters)
    if (this.hasHomographAttack(hostname)) {
      indicators.push('homograph_attack_detected');
      score += 30;
    }

    // Check for excessive subdomains
    if (this.hasExcessiveSubdomains(hostname)) {
      indicators.push('excessive_subdomains');
      score += 15;
    }

    // Check for brand impersonation
    const brandMatch = this.checkBrandImpersonation(hostname);
    if (brandMatch) {
      indicators.push(`brand_impersonation_${brandMatch}`);
      score += 20;
    }

    // Check domain age and reputation (limited check)
    if (this.looksNewOrSuspicious(hostname)) {
      indicators.push('suspicious_domain_pattern');
      score += 10;
    }

    // Check for suspicious keywords in domain
    if (this.containsSuspiciousKeywords(hostname)) {
      indicators.push('suspicious_keywords_in_domain');
      score += 15;
    }

    return {score: Math.min(100, score), indicators};
  }

  /**
   * Analyze URL path for phishing indicators
   */
  private analyzePath(pathname: string): {score: number; indicators: string[]} {
    const indicators: string[] = [];
    let score = 0;

    // Check path length
    if (pathname.length > 200) {
      indicators.push('excessive_path_length');
      score += 10;
    }

    // Check for encoded characters that might hide malicious paths
    if (/%/.test(pathname)) {
      indicators.push('url_encoded_path');
      score += 5;
    }

    // Check for keywords indicating fake pages
    const pathLower = pathname.toLowerCase();
    if (pathLower.includes('admin') || pathLower.includes('login') || pathLower.includes('signin')) {
      indicators.push('admin_login_path');
      score += 15;
    }

    if (pathLower.includes('verify') || pathLower.includes('confirm')) {
      indicators.push('verification_path');
      score += 12;
    }

    // Check for suspicious double slashes
    if (pathname.includes('//')) {
      indicators.push('double_slash_path');
      score += 20;
    }

    return {score: Math.min(100, score), indicators};
  }

  /**
   * Analyze query parameters for phishing indicators
   */
  private analyzeParameters(search: string): {score: number; indicators: string[]} {
    const indicators: string[] = [];
    let score = 0;

    if (!search) return {score: 0, indicators: []};

    // Check for excessive parameters
    const paramCount = search.split('&').length;
    if (paramCount > 10) {
      indicators.push('excessive_parameters');
      score += 10;
    }

    // Check for redirect parameters
    if (search.includes('redirect') || search.includes('return') || search.includes('redir')) {
      indicators.push('redirect_parameter');
      score += 15;
    }

    // Check for email parameters (common in phishing)
    if (search.includes('email') || search.includes('user') || search.includes('account')) {
      indicators.push('user_info_parameter');
      score += 10;
    }

    // Check for obfuscated parameters
    if (this.hasObfuscatedParameters(search)) {
      indicators.push('obfuscated_parameters');
      score += 15;
    }

    return {score: Math.min(100, score), indicators};
  }

  /**
   * Analyze overall URL structure
   */
  private analyzeStructure(
    fullUrl: string,
    parsedUrl: URL
  ): {score: number; indicators: string[]} {
    const indicators: string[] = [];
    let score = 0;

    // Check for HTTPS
    if (parsedUrl.protocol !== 'https:') {
      indicators.push('not_https');
      score += 10;
    }

    // Check for unusual protocols
    if (!['http:', 'https:', 'ftp:', 'ftps:'].includes(parsedUrl.protocol)) {
      indicators.push('unusual_protocol');
      score += 20;
    }

    // Check for very long URL
    if (fullUrl.length > 2048) {
      indicators.push('extremely_long_url');
      score += 15;
    }

    // Check for URL with sensitive keywords
    const urlLower = fullUrl.toLowerCase();
    for (const keyword of Array.from(this.commonPhishingKeywords)) {
      if (urlLower.includes(keyword)) {
        indicators.push(`contains_keyword_${keyword}`);
        score += 2;
        if (score > 100) break;
      }
    }

    return {score: Math.min(100, score), indicators};
  }

  // Helper methods
  private isTyposquatting(hostname: string): boolean {
    const commonBrands = ['google', 'facebook', 'amazon', 'apple', 'paypal', 'microsoft', 'netflix'];
    const domain = hostname.toLowerCase();

    for (const brand of commonBrands) {
      if (domain.includes(brand)) {
        // Check if it's close to the brand but not exact
        const similarity = this.stringSimilarity(domain, brand);
        if (similarity > 0.7 && similarity < 1.0) {
          return true;
        }
      }
    }

    return false;
  }

  private hasSuspiciousTLD(hostname: string): boolean {
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.xyz', '.top'];
    const lowerHostname = hostname.toLowerCase();
    return suspiciousTLDs.some(tld => lowerHostname.endsWith(tld));
  }

  private isIPAddress(hostname: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
  }

  private hasHomographAttack(hostname: string): boolean {
    // Check for confusable Unicode characters
    const confusableChars = ['а', 'е', 'о', 'р', 'с', 'у', 'х', 'ы', 'ї'];
    return confusableChars.some(char => hostname.includes(char));
  }

  private hasExcessiveSubdomains(hostname: string): boolean {
    const parts = hostname.split('.');
    return parts.length > 4;
  }

  private checkBrandImpersonation(hostname: string): string | null {
    for (const [brand, legitimateDomains] of this.brandDomains) {
      const lowerHostname = hostname.toLowerCase();
      
      if (lowerHostname.includes(brand) && !legitimateDomains.includes(hostname)) {
        // Check if it might be legitimate brand subdomain
        const isSubdomain = legitimateDomains.some(legitimate => 
          lowerHostname.endsWith(legitimate)
        );
        
        if (!isSubdomain) {
          return brand;
        }
      }
    }
    return null;
  }

  private looksNewOrSuspicious(hostname: string): boolean {
    const domain = hostname.toLowerCase();
    
    // Check for numeric patterns often used in spam
    if (/\d{5,}/.test(domain)) return true;
    
    // Check for randomness
    const consonants = (domain.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    const vowels = (domain.match(/[aeiou]/gi) || []).length;
    const ratio = consonants / (consonants + vowels || 1);
    
    // Very high consonant ratio indicates random/suspicious domain
    return ratio > 0.8;
  }

  private containsSuspiciousKeywords(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();
    
    for (const keyword of Array.from(this.suspiciousDomains)) {
      if (lowerHostname.includes(keyword)) {
        return true;
      }
    }
    
    for (const keyword of Array.from(this.commonPhishingKeywords)) {
      if (lowerHostname.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  private hasObfuscatedParameters(search: string): boolean {
    // Check for base64 encoded parameters
    if (/=[A-Za-z0-9+/]{20,}={0,2}(&|$)/.test(search)) {
      return true;
    }

    // Check for hex encoded parameters
    if (/%[0-9A-Fa-f]{2}/.test(search)) {
      return true;
    }

    return false;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }
}

// Singleton instance
let urlModel: URLPhishingModel | null = null;

/**
 * Get or create URL phishing model instance
 */
export function getURLPhishingModel(): URLPhishingModel {
  if (!urlModel) {
    urlModel = new URLPhishingModel();
  }
  return urlModel;
}
