/**
 * QR Code Dataset Processor
 * Processes QR code image datasets for training and testing
 * Handles both archive14 (phishing QR codes) and archive12 (benign QR codes)
 */

export interface QRDatasetMetadata {
  totalImages: number;
  phishingCount: number;
  benignCount: number;
  versions: Map<string, number>;
  imagesPaths: string[];
}

export interface QRCodeTrainingRecord {
  imagePath: string;
  imageId: string;
  isPhishing: boolean;
  version: string;
  category: string;
  complexity: number;
  decodedURL?: string;
  threatIndicators?: string[];
}

export interface QRDatasetSplit {
  training: QRCodeTrainingRecord[];
  validation: QRCodeTrainingRecord[];
  testing: QRCodeTrainingRecord[];
  metadata: {
    totalRecords: number;
    phishingTraining: number;
    benignTraining: number;
    trainingRatio: number;
    balanceRatio: number;
  };
}

/**
 * QR Code Dataset Processor
 */
export class QRDatasetProcessor {
  /**
   * Analyze QR dataset from archive14 (phishing codes)
   * Dataset structure: qr_dataset/[id]-v[version].png
   */
  async analyzeArchive14Dataset(
    imageNames: string[]
  ): Promise<QRDatasetMetadata> {
    const metadata: QRDatasetMetadata = {
      totalImages: 0,
      phishingCount: 0,
      benignCount: 0,
      versions: new Map(),
      imagesPaths: []
    };

    const versionMap = new Map<string, number>();

    for (const imageName of imageNames) {
      if (!imageName.includes('.png')) continue;

      // Parse filename: [id]-v[version].png
      const match = imageName.match(/\/(\d+)-v(\d+)\.png$/);
      if (match) {
        const [, id, version] = match;
        const versionKey = `v${version}`;

        versionMap.set(versionKey, (versionMap.get(versionKey) || 0) + 1);
        metadata.totalImages++;
        metadata.phishingCount++; // Archive14 is phishing dataset
        metadata.imagesPaths.push(imageName);
      }
    }

    metadata.versions = versionMap;

    return metadata;
  }

  /**
   * Analyze QR dataset from archive12 (benign codes)
   * Dataset structure: Multi-version QR codes dataset/version_[v]/[type]/[filename].png
   */
  async analyzeArchive12Dataset(
    imageNames: string[]
  ): Promise<QRDatasetMetadata> {
    const metadata: QRDatasetMetadata = {
      totalImages: 0,
      phishingCount: 0,
      benignCount: 0,
      versions: new Map(),
      imagesPaths: []
    };

    const versionMap = new Map<string, number>();

    for (const imageName of imageNames) {
      if (!imageName.includes('.png')) continue;

      // Parse filename: version_[v]/[type]/[filename].png
      const match = imageName.match(/version_(\d+)\/(\w+)\//);
      if (match) {
        const [, version, type] = match;
        const versionKey = `v${version}`;

        versionMap.set(versionKey, (versionMap.get(versionKey) || 0) + 1);
        metadata.totalImages++;

        if (type.includes('benign')) {
          metadata.benignCount++;
        } else {
          metadata.phishingCount++;
        }

        metadata.imagesPaths.push(imageName);
      }
    }

    metadata.versions = versionMap;

    return metadata;
  }

  /**
   * Create training records from QR images
   */
  createTrainingRecords(
    imageNames: string[],
    isPhishingDataset: boolean
  ): QRCodeTrainingRecord[] {
    const records: QRCodeTrainingRecord[] = [];

    for (const imageName of imageNames) {
      if (!imageName.includes('.png')) continue;

      let record: QRCodeTrainingRecord | null = null;

      // Parse archive14 format
      if (isPhishingDataset) {
        const match = imageName.match(/\/(\d+)-v(\d+)\.png$/);
        if (match) {
          const [, id, version] = match;
          record = {
            imagePath: imageName,
            imageId: id,
            isPhishing: true,
            version: `v${version}`,
            category: 'phishing_qr',
            complexity: this.estimateComplexity(`v${version}`),
            threatIndicators: [
              'qr_encoded_malicious_url',
              `version_${version}_qr`
            ]
          };
        }
      } else {
        // Parse archive12 format
        const match = imageName.match(/version_(\d+)\/(\w+)\/(.+)\.png$/);
        if (match) {
          const [, version, type, filename] = match;
          const isPhishing = type.includes('malicious');

          record = {
            imagePath: imageName,
            imageId: filename,
            isPhishing,
            version: `v${version}`,
            category: type,
            complexity: this.estimateComplexity(`v${version}`),
            threatIndicators: isPhishing
              ? ['suspicious_url_encoded', `version_${version}_qr`]
              : []
          };
        }
      }

      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Split dataset into training/validation/testing
   */
  splitDataset(
    records: QRCodeTrainingRecord[],
    trainRatio: number = 0.7,
    valRatio: number = 0.15
  ): QRDatasetSplit {
    // Shuffle records
    const shuffled = [...records].sort(() => Math.random() - 0.5);

    // Split by phishing/benign to maintain balance
    const phishing = shuffled.filter(r => r.isPhishing);
    const benign = shuffled.filter(r => !r.isPhishing);

    const trainPhishing = Math.floor(phishing.length * trainRatio);
    const valPhishing = Math.floor(phishing.length * valRatio);

    const trainBenign = Math.floor(benign.length * trainRatio);
    const valBenign = Math.floor(benign.length * valRatio);

    return {
      training: [
        ...phishing.slice(0, trainPhishing),
        ...benign.slice(0, trainBenign)
      ],
      validation: [
        ...phishing.slice(trainPhishing, trainPhishing + valPhishing),
        ...benign.slice(trainBenign, trainBenign + valBenign)
      ],
      testing: [
        ...phishing.slice(trainPhishing + valPhishing),
        ...benign.slice(trainBenign + valBenign)
      ],
      metadata: {
        totalRecords: records.length,
        phishingTraining: trainPhishing,
        benignTraining: trainBenign,
        trainingRatio: trainRatio,
        balanceRatio: trainPhishing > 0 && trainBenign > 0
          ? Math.min(trainPhishing, trainBenign) / Math.max(trainPhishing, trainBenign)
          : 0
      }
    };
  }

  /**
   * Estimate QR code complexity based on version
   * Higher version = more data capacity = potentially more complex
   */
  private estimateComplexity(version: string): number {
    const versionNum = parseInt(version.replace('v', ''), 10);

    // QR versions 1-40, normalize to 0-1 scale
    return Math.min(1, versionNum / 40);
  }

  /**
   * Extract features from QR image for analysis
   */
  async extractQRFeatures(
    imageBlob: Blob
  ): Promise<{
    size: number;
    format: string;
    complexity: number;
    patterns: string[];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const img = new Image();
          img.onload = () => {
            // Analyze image properties
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({
                size: imageBlob.size,
                format: imageBlob.type,
                complexity: 0.5,
                patterns: []
              });
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            // Analyze pixel distribution for QR patterns
            const patterns = this.analyzePixelPatterns(
              imageData.data,
              img.width,
              img.height
            );

            resolve({
              size: imageBlob.size,
              format: imageBlob.type,
              complexity: Math.min(1, img.width / 1000), // Normalize by typical size
              patterns
            });
          };

          img.onerror = () => {
            resolve({
              size: imageBlob.size,
              format: imageBlob.type,
              complexity: 0.5,
              patterns: []
            });
          };

          img.src = event.target?.result as string;
        } catch (error) {
          console.error('Feature extraction error:', error);
          resolve({
            size: imageBlob.size,
            format: imageBlob.type,
            complexity: 0.5,
            patterns: []
          });
        }
      };

      reader.onerror = () => {
        resolve({
          size: imageBlob.size,
          format: imageBlob.type,
          complexity: 0.5,
          patterns: []
        });
      };

      reader.readAsDataURL(imageBlob);
    });
  }

  /**
   * Analyze pixel patterns in QR image
   */
  private analyzePixelPatterns(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): string[] {
    const patterns: string[] = [];

    // Check for black/white balance (QR indicator)
    let blackCount = 0;
    let whiteCount = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];

      const gray = (r + g + b) / 3;

      if (gray < 128) {
        blackCount++;
      } else {
        whiteCount++;
      }
    }

    const blackRatio = blackCount / (blackCount + whiteCount);

    if (blackRatio > 0.45 && blackRatio < 0.55) {
      patterns.push('balanced_bw_distribution');
    } else if (blackRatio > 0.6) {
      patterns.push('high_black_content');
    } else if (blackRatio < 0.4) {
      patterns.push('high_white_content');
    }

    // Check for structural patterns (finder patterns, timing patterns)
    const structureScore = this.detectQRStructure(imageData, width, height);
    if (structureScore > 0.7) {
      patterns.push('strong_qr_structure');
    } else if (structureScore > 0.4) {
      patterns.push('partial_qr_structure');
    } else {
      patterns.push('weak_qr_structure');
    }

    // Check for edge detection (clean vs noisy)
    const edgeIntensity = this.detectEdgeIntensity(imageData, width, height);
    if (edgeIntensity > 0.7) {
      patterns.push('high_edge_clarity');
    } else if (edgeIntensity < 0.3) {
      patterns.push('low_edge_clarity');
    }

    return patterns;
  }

  /**
   * Detect QR structural patterns
   */
  private detectQRStructure(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    // Simplified structure detection
    // Real implementation would use more sophisticated pattern matching

    let structureScore = 0;

    // Check corners for finder patterns
    const cornerSize = Math.min(width, height) / 10;
    const corners = [
      { x: 0, y: 0 }, // Top-left
      { x: width - cornerSize, y: 0 }, // Top-right
      { x: 0, y: height - cornerSize } // Bottom-left
    ];

    for (const corner of corners) {
      let cornerBlackCount = 0;
      for (let y = corner.y; y < corner.y + cornerSize; y++) {
        for (let x = corner.x; x < corner.x + cornerSize; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            const gray = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
            if (gray < 128) cornerBlackCount++;
          }
        }
      }

      const cornerArea = cornerSize * cornerSize;
      const cornerRatio = cornerBlackCount / cornerArea;

      // Finder patterns should have ~50% black
      if (cornerRatio > 0.3 && cornerRatio < 0.7) {
        structureScore += 0.33;
      }
    }

    return structureScore;
  }

  /**
   * Detect edge intensity in image
   */
  private detectEdgeIntensity(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    let edgeCount = 0;

    // Simple edge detection
    for (let i = 0; i < imageData.length - width * 4; i += 4) {
      if (i % (width * 4) === 0) continue; // Skip row edges

      const current = imageData[i];
      const next = imageData[i + 4];

      if (Math.abs(current - next) > 50) {
        edgeCount++;
      }
    }

    const edgeRatio = edgeCount / (imageData.length / 4);

    return Math.min(1, edgeRatio);
  }

  /**
   * Generate dataset statistics
   */
  getDatasetStatistics(records: QRCodeTrainingRecord[]): {
    totalCount: number;
    phishingCount: number;
    benignCount: number;
    phishingRatio: number;
    versionDistribution: Map<string, number>;
    complexityDistribution: {min: number; max: number; avg: number};
  } {
    const phishingCount = records.filter(r => r.isPhishing).length;
    const benignCount = records.length - phishingCount;

    const versionDistribution = new Map<string, number>();
    let totalComplexity = 0;
    let minComplexity = 1;
    let maxComplexity = 0;

    for (const record of records) {
      versionDistribution.set(
        record.version,
        (versionDistribution.get(record.version) || 0) + 1
      );

      totalComplexity += record.complexity;
      minComplexity = Math.min(minComplexity, record.complexity);
      maxComplexity = Math.max(maxComplexity, record.complexity);
    }

    return {
      totalCount: records.length,
      phishingCount,
      benignCount,
      phishingRatio: phishingCount / records.length,
      versionDistribution,
      complexityDistribution: {
        min: minComplexity,
        max: maxComplexity,
        avg: totalComplexity / records.length
      }
    };
  }
}

// Singleton instance
let processor: QRDatasetProcessor | null = null;

/**
 * Get or create QR dataset processor
 */
export function getQRDatasetProcessor(): QRDatasetProcessor {
  if (!processor) {
    processor = new QRDatasetProcessor();
  }
  return processor;
}
