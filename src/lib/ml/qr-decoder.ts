/**
 * QR Code Decoder Module
 * Decodes QR code images to extract URLs using jsQR library
 * Part of QR Decoder + URL Model algorithm for phishing detection
 */

import jsQR from 'jsqr';

/**
 * Invert image colors (for inverted QR codes - white on black)
 */
function invertImageData(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
    // Alpha channel (i + 3) stays the same
  }
  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Convert image to grayscale for better QR detection
 */
function grayscaleImageData(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;     // R
    data[i + 1] = avg; // G
    data[i + 2] = avg; // B
    // Alpha channel stays the same
  }
  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Enhance contrast for better QR detection
 */
function enhanceContrastImageData(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const factor = 1.5; // Contrast factor
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Try to decode QR code with jsQR
 */
function tryDecode(imageData: ImageData, options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' }): ReturnType<typeof jsQR> {
  return jsQR(imageData.data, imageData.width, imageData.height, options);
}

/**
 * Decode QR code from image data
 * @param imageData Canvas ImageData object
 * @returns Decoded data or null if decoding fails
 */
export async function decodeQRFromImageData(
  imageData: ImageData
): Promise<string | null> {
  try {
    console.log('🔬 [QR-Decoder] Running jsQR decoder on image data:', {
      width: imageData.width,
      height: imageData.height,
      dataLength: imageData.data.length,
      pixelCount: imageData.width * imageData.height
    });
    
    // Try 1: Standard decode with both inversion attempts
    console.log('🔍 [QR-Decoder] Attempt 1: Standard decode with auto-inversion...');
    let result = tryDecode(imageData, { inversionAttempts: 'attemptBoth' });
    
    if (result && result.data) {
      console.log('✅ [QR-Decoder] jsQR decode SUCCESS (standard):', {
        content: result.data.substring(0, 50) + (result.data.length > 50 ? '...' : ''),
        length: result.data.length
      });
      return result.data;
    }
    
    // Try 2: Grayscale conversion
    console.log('🔍 [QR-Decoder] Attempt 2: Grayscale conversion...');
    const grayscaleData = grayscaleImageData(imageData);
    result = tryDecode(grayscaleData, { inversionAttempts: 'attemptBoth' });
    
    if (result && result.data) {
      console.log('✅ [QR-Decoder] jsQR decode SUCCESS (grayscale):', {
        content: result.data.substring(0, 50) + (result.data.length > 50 ? '...' : ''),
        length: result.data.length
      });
      return result.data;
    }
    
    // Try 3: Enhanced contrast
    console.log('🔍 [QR-Decoder] Attempt 3: Enhanced contrast...');
    const contrastData = enhanceContrastImageData(imageData);
    result = tryDecode(contrastData, { inversionAttempts: 'attemptBoth' });
    
    if (result && result.data) {
      console.log('✅ [QR-Decoder] jsQR decode SUCCESS (enhanced contrast):', {
        content: result.data.substring(0, 50) + (result.data.length > 50 ? '...' : ''),
        length: result.data.length
      });
      return result.data;
    }
    
    // Try 4: Inverted colors (for white QR on dark background)
    console.log('🔍 [QR-Decoder] Attempt 4: Inverted colors...');
    const invertedData = invertImageData(imageData);
    result = tryDecode(invertedData, { inversionAttempts: 'attemptBoth' });
    
    if (result && result.data) {
      console.log('✅ [QR-Decoder] jsQR decode SUCCESS (inverted):', {
        content: result.data.substring(0, 50) + (result.data.length > 50 ? '...' : ''),
        length: result.data.length
      });
      return result.data;
    }
    
    // Try 5: Grayscale + enhanced contrast
    console.log('🔍 [QR-Decoder] Attempt 5: Grayscale + enhanced contrast...');
    const grayContrastData = enhanceContrastImageData(grayscaleImageData(imageData));
    result = tryDecode(grayContrastData, { inversionAttempts: 'attemptBoth' });
    
    if (result && result.data) {
      console.log('✅ [QR-Decoder] jsQR decode SUCCESS (gray+contrast):', {
        content: result.data.substring(0, 50) + (result.data.length > 50 ? '...' : ''),
        length: result.data.length
      });
      return result.data;
    }
    
    console.warn('⚠️  [QR-Decoder] jsQR returned no result after all attempts - QR code pattern not found in image');
    return null;
  } catch (error) {
    console.error('❌ [QR-Decoder] jsQR decoding error:', error, {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Decode QR from image blob/file with multiple scale attempts
 */
async function tryDecodeAtScale(
  img: HTMLImageElement,
  scale: number
): Promise<string | null> {
  const canvas = document.createElement('canvas');
  const targetWidth = Math.round(img.width * scale);
  const targetHeight = Math.round(img.height * scale);
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    console.error('❌ [QR-Decoder] Failed to get canvas context (2d)');
    return null;
  }
  
  // Use better image smoothing for scaled images
  ctx.imageSmoothingEnabled = scale < 1;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  
  console.log(`🔍 [QR-Decoder] Trying decode at scale ${scale}x (${targetWidth}x${targetHeight})...`);
  return decodeQRFromImageData(imageData);
}

/**
 * Decode QR from image blob/file
 */
export async function decodeQRFromImage(
  imageBlob: Blob | File
): Promise<string | null> {
  console.log('📸 [QR-Decoder] Starting QR decode from image:', {
    fileName: imageBlob instanceof File ? imageBlob.name : 'blob',
    size: imageBlob.size,
    type: imageBlob.type
  });

  try {
    return new Promise((resolve) => {
      const reader = new FileReader();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      reader.onload = async (event) => {
        try {
          console.log('📂 [QR-Decoder] FileReader loaded successfully');
          const img = new Image();
          let imageLoadTimeout: ReturnType<typeof setTimeout> | null = null;
          
          img.onload = async () => {
            if (imageLoadTimeout) clearTimeout(imageLoadTimeout);
            console.log('🖼️  [QR-Decoder] Image loaded successfully:', {
              width: img.width,
              height: img.height,
              aspectRatio: (img.width / img.height).toFixed(2)
            });
            
            try {
              // Try at original scale first
              let result = await tryDecodeAtScale(img, 1.0);
              
              if (result) {
                console.log('✅ [QR-Decoder] QR decode SUCCESS at 1.0x scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                if (timeoutId) clearTimeout(timeoutId);
                resolve(result);
                return;
              }
              
              // For very large images, try scaling down
              if (img.width > 1000 || img.height > 1000) {
                console.log('📏 [QR-Decoder] Large image detected, trying scaled versions...');
                
                // Try at 50% scale
                result = await tryDecodeAtScale(img, 0.5);
                if (result) {
                  console.log('✅ [QR-Decoder] QR decode SUCCESS at 0.5x scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(result);
                  return;
                }
                
                // Try at 25% scale
                result = await tryDecodeAtScale(img, 0.25);
                if (result) {
                  console.log('✅ [QR-Decoder] QR decode SUCCESS at 0.25x scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(result);
                  return;
                }
              }
              
              // For small images, try scaling up
              if (img.width < 200 || img.height < 200) {
                console.log('📏 [QR-Decoder] Small image detected, trying scaled up versions...');
                
                // Try at 2x scale
                result = await tryDecodeAtScale(img, 2.0);
                if (result) {
                  console.log('✅ [QR-Decoder] QR decode SUCCESS at 2.0x scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(result);
                  return;
                }
                
                // Try at 3x scale
                result = await tryDecodeAtScale(img, 3.0);
                if (result) {
                  console.log('✅ [QR-Decoder] QR decode SUCCESS at 3.0x scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(result);
                  return;
                }
              }
              
              // Try a normalized size (800x800 or proportional)
              const maxDim = Math.max(img.width, img.height);
              if (maxDim !== 800) {
                const normalizedScale = 800 / maxDim;
                console.log(`📏 [QR-Decoder] Trying normalized scale (${normalizedScale.toFixed(2)}x to ~800px)...`);
                result = await tryDecodeAtScale(img, normalizedScale);
                if (result) {
                  console.log('✅ [QR-Decoder] QR decode SUCCESS at normalized scale:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(result);
                  return;
                }
              }
              
              console.warn('⚠️  [QR-Decoder] QR decode returned null after all scale attempts - pattern not detected');
              if (timeoutId) clearTimeout(timeoutId);
              resolve(null);
            } catch (error) {
              console.error('❌ [QR-Decoder] Image processing error:', error);
              if (timeoutId) clearTimeout(timeoutId);
              resolve(null);
            }
          };
          
          img.onerror = (e) => {
            console.error('❌ [QR-Decoder] Image loading failed - invalid image data', e);
            if (imageLoadTimeout) clearTimeout(imageLoadTimeout);
            if (timeoutId) clearTimeout(timeoutId);
            resolve(null);
          };
          
          // Set image load timeout
          imageLoadTimeout = setTimeout(() => {
            console.warn('⏱️  [QR-Decoder] Image load timeout (>10s)');
            if (timeoutId) clearTimeout(timeoutId);
            resolve(null);
          }, 10000);
          
          console.log('🔗 [QR-Decoder] Setting image src from FileReader...');
          img.src = event.target?.result as string;
        } catch (error) {
          console.error('❌ [QR-Decoder] Image loading error:', error);
          if (timeoutId) clearTimeout(timeoutId);
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        console.error('❌ [QR-Decoder] FileReader error - file read failed');
        if (timeoutId) clearTimeout(timeoutId);
        resolve(null);
      };
      
      reader.onabort = () => {
        console.warn('⚠️  [QR-Decoder] FileReader aborted');
        if (timeoutId) clearTimeout(timeoutId);
        resolve(null);
      };
      
      // Overall operation timeout
      timeoutId = setTimeout(() => {
        console.warn('⏱️  [QR-Decoder] Overall decode operation timeout (>15s)');
        resolve(null);
      }, 15000);
      
      console.log('📖 [QR-Decoder] Starting FileReader.readAsDataURL...');
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error('❌ [QR-Decoder] Critical QR image decoding error:', error);
    return null;
  }
}

/**
 * Batch decode multiple QR images
 */
export async function batchDecodeQRImages(
  images: Array<Blob | File>
): Promise<Array<string | null>> {
  const results = await Promise.all(
    images.map(img => decodeQRFromImage(img))
  );
  return results;
}

/**
 * Decode QR from canvas element
 */
export async function decodeQRFromCanvas(
  canvas: HTMLCanvasElement
): Promise<string | null> {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return null;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQRFromImageData(imageData);
  } catch (error) {
    console.error('Canvas QR decoding error:', error);
    return null;
  }
}

/**
 * Real-time QR scanning from video element
 * @param videoElement Video element to scan
 * @param onDetection Callback when QR is detected
 * @returns Function to stop scanning
 */
export async function startRealTimeQRScanning(
  videoElement: HTMLVideoElement,
  onDetection: (data: string) => void
): Promise<() => void> {
  let scanning = true;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const detectedCodes = new Set<string>();

  const scan = async () => {
    if (!scanning) return;

    try {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      if (canvas.width === 0 || canvas.height === 0) {
        if (scanning) {
          requestAnimationFrame(scan);
        }
        return;
      }
      
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const decodedData = await decodeQRFromImageData(imageData);

      // Only report if QR was successfully decoded and is new
      if (decodedData && !detectedCodes.has(decodedData)) {
        detectedCodes.add(decodedData);
        onDetection(decodedData);
        
        // Clear detection after a delay to allow for different codes
        setTimeout(() => {
          detectedCodes.delete(decodedData);
        }, 2000);
      }
    } catch (error) {
      console.error('Real-time scan error:', error);
    }

    if (scanning) {
      requestAnimationFrame(scan);
    }
  };

  // Start scanning
  scan();

  // Return function to stop scanning
  return () => {
    scanning = false;
  };
}
