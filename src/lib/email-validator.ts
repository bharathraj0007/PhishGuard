/**
 * Email Validator - RFC 5322 Compliant Email Validation
 * 
 * Provides robust email validation and analysis with:
 * - RFC 5322 compliant regex pattern matching
 * - Format validation (local part + domain)
 * - Common TLD validation
 * - Suspicious pattern detection
 * - Confidence scoring system
 */

export interface EmailValidationResult {
  isValid: boolean;
  email: string | null;
  confidence: number; // 0-100
  errors: string[];
  warnings: string[];
  analysis: {
    format: boolean;
    domain: boolean;
    localPart: boolean;
    suspiciousPatterns: string[];
    tldValid: boolean;
  };
}

export interface EmailAddress {
  localPart: string;
  domain: string;
  fullEmail: string;
}

class EmailValidator {
  /**
   * RFC 5322 compliant email regex with relaxed rules for maximum compatibility
   * Matches most valid email formats while being practical
   */
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  /**
   * Stricter validation regex for maximum accuracy
   * Follows RFC 5321 recommendations
   */
  private readonly STRICT_EMAIL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  /**
   * Common valid TLDs (not exhaustive, but covers 99% of cases)
   */
  private readonly COMMON_TLDS = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'co', 'uk', 'us', 'ca', 'au', 'de', 'fr', 'it', 'es', 'ru', 'jp', 'cn', 'in', 'br', 'mx', 'za',
    'nz', 'se', 'no', 'dk', 'fi', 'nl', 'be', 'ch', 'at', 'cz', 'pl', 'pt', 'gr', 'ie',
    'info', 'biz', 'name', 'pro', 'mobi', 'asia', 'tel', 'travel',
    'tv', 'ws', 'cc', 'ws', 'io', 'app', 'dev', 'tech', 'online',
    'ai', 'cloud', 'digital', 'solutions', 'services', 'support',
    'email', 'help', 'blog', 'shop', 'store', 'site', 'web',
    'xyz', 'fun', 'games', 'jobs', 'music', 'photos', 'photography',
    'social', 'news', 'media', 'network', 'systems', 'software'
  ]);

  /**
   * Validate email address with comprehensive checks
   */
  validateEmail(email: string, strictMode: boolean = false): EmailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 100;

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Basic checks
    if (!normalizedEmail) {
      return {
        isValid: false,
        email: null,
        confidence: 0,
        errors: ['Email address is empty'],
        warnings: [],
        analysis: {
          format: false,
          domain: false,
          localPart: false,
          suspiciousPatterns: [],
          tldValid: false
        }
      };
    }

    // Length check
    if (normalizedEmail.length > 254) {
      errors.push('Email address exceeds maximum length (254 characters)');
      confidence -= 20;
    }

    // Check for @ symbol
    const atCount = (normalizedEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      errors.push(`Email must contain exactly one @ symbol (found ${atCount})`);
      confidence -= 30;
    }

    // Split into parts
    const parts = normalizedEmail.split('@');
    if (parts.length !== 2) {
      return {
        isValid: false,
        email: normalizedEmail,
        confidence: Math.max(0, confidence),
        errors: [...errors, 'Invalid email format'],
        warnings,
        analysis: {
          format: false,
          domain: false,
          localPart: false,
          suspiciousPatterns: this.detectSuspiciousPatterns(normalizedEmail),
          tldValid: false
        }
      };
    }

    const [localPart, domain] = parts;

    // Validate local part
    const localPartValid = this.validateLocalPart(localPart, errors, warnings);
    confidence = localPartValid ? confidence - 5 : confidence - 25;

    // Validate domain
    const domainValid = this.validateDomain(domain, errors, warnings);
    confidence = domainValid ? confidence - 5 : confidence - 25;

    // Check TLD validity
    const tldValid = this.validateTLD(domain);
    if (!tldValid) {
      warnings.push('Domain TLD is uncommon or unrecognized');
      confidence -= 10;
    }

    // Detect suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(normalizedEmail);
    if (suspiciousPatterns.length > 0) {
      confidence -= suspiciousPatterns.length * 5;
    }

    // Apply regex validation
    const regexPattern = strictMode ? this.STRICT_EMAIL_REGEX : this.EMAIL_REGEX;
    const formatValid = regexPattern.test(normalizedEmail);
    if (!formatValid) {
      errors.push('Email does not match standard email format');
      confidence -= 20;
    }

    // Determine final validity
    const isValid = errors.length === 0 && formatValid && localPartValid && domainValid;

    // Ensure confidence is between 0-100
    confidence = Math.max(0, Math.min(100, confidence));

    return {
      isValid,
      email: normalizedEmail,
      confidence,
      errors,
      warnings,
      analysis: {
        format: formatValid,
        domain: domainValid,
        localPart: localPartValid,
        suspiciousPatterns,
        tldValid
      }
    };
  }

  /**
   * Validate local part (before @)
   */
  private validateLocalPart(localPart: string, errors: string[], warnings: string[]): boolean {
    if (!localPart || localPart.length === 0) {
      errors.push('Local part (before @) is empty');
      return false;
    }

    if (localPart.length > 64) {
      errors.push('Local part exceeds maximum length (64 characters)');
      return false;
    }

    // Check for consecutive dots
    if (localPart.includes('..')) {
      errors.push('Local part contains consecutive dots');
      return false;
    }

    // Check starting/ending with dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      errors.push('Local part cannot start or end with a dot');
      return false;
    }

    // Check valid characters
    const validLocalChars = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
    if (!validLocalChars.test(localPart)) {
      errors.push('Local part contains invalid characters');
      return false;
    }

    // Warn about unusual patterns
    if (/[0-9]{5,}/.test(localPart)) {
      warnings.push('Local part contains long sequence of numbers');
    }

    if (localPart.length < 2) {
      warnings.push('Local part is very short');
    }

    return true;
  }

  /**
   * Validate domain part (after @)
   */
  private validateDomain(domain: string, errors: string[], warnings: string[]): boolean {
    if (!domain || domain.length === 0) {
      errors.push('Domain is empty');
      return false;
    }

    if (domain.length > 255) {
      errors.push('Domain exceeds maximum length (255 characters)');
      return false;
    }

    // Must have at least one dot
    if (!domain.includes('.')) {
      errors.push('Domain must have at least one dot (TLD)');
      return false;
    }

    // Check for consecutive dots
    if (domain.includes('..')) {
      errors.push('Domain contains consecutive dots');
      return false;
    }

    // Check starting/ending with dot or hyphen
    if (domain.startsWith('.') || domain.endsWith('.')) {
      errors.push('Domain cannot start or end with a dot');
      return false;
    }

    if (domain.startsWith('-') || domain.endsWith('-')) {
      errors.push('Domain cannot start or end with a hyphen');
      return false;
    }

    // Check for valid characters
    const validDomainChars = /^[a-zA-Z0-9.-]+$/;
    if (!validDomainChars.test(domain)) {
      errors.push('Domain contains invalid characters');
      return false;
    }

    // Check each label in domain
    const labels = domain.split('.');
    for (const label of labels) {
      if (label.length === 0) {
        errors.push('Domain contains empty label');
        return false;
      }

      if (label.length > 63) {
        errors.push('Domain label exceeds maximum length (63 characters)');
        return false;
      }

      if (label.startsWith('-') || label.endsWith('-')) {
        errors.push('Domain label cannot start or end with hyphen');
        return false;
      }

      if (!/^[a-zA-Z0-9]/.test(label)) {
        errors.push('Domain label must start with alphanumeric character');
        return false;
      }
    }

    return true;
  }

  /**
   * Validate TLD (Top Level Domain)
   */
  private validateTLD(domain: string): boolean {
    const parts = domain.split('.');
    if (parts.length < 2) {
      return false;
    }

    const tld = parts[parts.length - 1].toLowerCase();

    // TLD must be at least 2 characters
    if (tld.length < 2) {
      return false;
    }

    // TLD must be alphabetic
    if (!/^[a-zA-Z]+$/.test(tld)) {
      return false;
    }

    // Check against common TLDs
    return this.COMMON_TLDS.has(tld);
  }

  /**
   * Detect suspicious patterns in email
   */
  private detectSuspiciousPatterns(email: string): string[] {
    const patterns: string[] = [];

    // Check for repeating characters
    if (/(.)\1{4,}/.test(email)) {
      patterns.push('Excessive repeating characters');
    }

    // Check for numbers only
    if (/^\d+@/.test(email)) {
      patterns.push('Local part is purely numeric');
    }

    // Check for suspicious domains
    if (/test@|admin@|root@|support@|noreply@/.test(email)) {
      patterns.push('Possible system or automated email');
    }

    // Check for temporary email domains
    if (/tempmail|guerrillamail|throwaway|temp10min|mailinator|sharklasers|grr\.la|getnada|fakeinbox|spam4me|10minutemail|guerrillamail|mailnesia|minuteemail/.test(email)) {
      patterns.push('Temporary or disposable email domain');
    }

    // Check for suspicious TLD patterns
    if (/(\.tk|\.ml|\.ga|\.cf)$/i.test(email)) {
      patterns.push('Uncommon or high-risk TLD');
    }

    // Check for punycode (internationalized domains)
    if (/xn--/.test(email)) {
      patterns.push('Punycode domain (internationalized)');
    }

    // Check for very long local part
    const localPart = email.split('@')[0];
    if (localPart && localPart.length > 40) {
      patterns.push('Unusually long local part');
    }

    return patterns;
  }

  /**
   * Extract emails from text content
   */
  extractEmails(text: string): EmailAddress[] {
    const emailMatches = text.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?:\.[a-zA-Z]{2,})?/g) || [];

    return emailMatches
      .filter((email, index, self) => self.indexOf(email) === index) // Remove duplicates
      .map(email => {
        const [localPart, domain] = email.split('@');
        return { localPart, domain, fullEmail: email };
      });
  }

  /**
   * Calculate confidence score for email detection in phishing context
   */
  calculatePhishingConfidence(email: string): { confidence: number; riskFactors: string[] } {
    const validation = this.validateEmail(email);
    const riskFactors: string[] = [];

    let confidence = validation.confidence;

    // Adjust for suspicious patterns
    if (validation.analysis.suspiciousPatterns.length > 0) {
      riskFactors.push(...validation.analysis.suspiciousPatterns);
      confidence -= validation.analysis.suspiciousPatterns.length * 8;
    }

    // Adjust for validation errors
    if (validation.errors.length > 0) {
      riskFactors.push(...validation.errors);
      confidence -= validation.errors.length * 5;
    }

    // Adjust for warnings
    if (validation.warnings.length > 0) {
      riskFactors.push(...validation.warnings);
      confidence -= validation.warnings.length * 3;
    }

    // Ensure confidence is between 0-100
    confidence = Math.max(0, Math.min(100, confidence));

    return { confidence, riskFactors };
  }
}

// Export singleton instance
export const emailValidator = new EmailValidator();
