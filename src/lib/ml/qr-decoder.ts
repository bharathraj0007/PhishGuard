/**
 * QR Code Decoder Module
 * Decodes QR code images to extract URLs using jsQR library
 * Part of QR Decoder + URL Model algorithm for phishing detection
 */

import jsQR from 'jsqr';

/**
 * Decode QR code from image data
 * @param imageData Canvas ImageData object
 * @returns Decoded data or null if decoding fails
 */
export async function decodeQRFromImageData(
  imageData: ImageData
): Promise<string | null> {
  try {
    // Use jsQR to decode the QR code from image data
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (result && result.data) {
      return result.data;
    }
    
    return null;
  } catch (error) {
    console.error('QR decoding error:', error);
    return null;
  }
}

/**
 * Decode QR from image blob/file
 */
export async function decodeQRFromImage(
  imageBlob: Blob | File
): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const img = new Image();
          img.onload = async () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                console.error('Failed to get canvas context');
                resolve(null);
                return;
              }
              
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              
              const result = await decodeQRFromImageData(imageData);
              resolve(result);
            } catch (error) {
              console.error('Image processing error:', error);
              resolve(null);
            }
          };
          
          img.onerror = () => {
            console.error('Image loading failed');
            resolve(null);
          };
          
          // Set a timeout to prevent hanging
          const timeout = setTimeout(() => {
            console.warn('Image load timeout');
            resolve(null);
          }, 10000);
          
          img.src = event.target?.result as string;
          
          // Clear timeout on success
          img.onload = ((originalOnLoad) => {
            return function() {
              clearTimeout(timeout);
              originalOnLoad.call(this);
            };
          })(img.onload as any);
        } catch (error) {
          console.error('Image loading error:', error);
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error');
        resolve(null);
      };
      
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error('QR image decoding error:', error);
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
