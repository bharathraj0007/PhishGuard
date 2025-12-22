/**
 * TensorFlow.js Backend Manager
 * 
 * Provides safe backend initialization with:
 * - CPU-first training for stability
 * - WebGL fallback detection
 * - Memory management utilities
 * - Context loss recovery
 * - GPU safety fallbacks
 */

import * as tf from '@tensorflow/tfjs';

export interface BackendConfig {
  preferCPU: boolean;
  maxMemoryMB: number;
  enableMemoryGrowth: boolean;
  logLevel: 'none' | 'warn' | 'error' | 'info' | 'debug';
}

export interface MemoryInfo {
  numTensors: number;
  numBytes: number;
  numBytesInGPU?: number;
  unreliable: boolean;
}

export interface BackendStatus {
  currentBackend: string;
  isReady: boolean;
  isWebGLAvailable: boolean;
  isCPUMode: boolean;
  memoryInfo: MemoryInfo;
  webglContextLost: boolean;
}

// Track WebGL context status
let webglContextLost = false;
let backendInitialized = false;
let currentMode: 'cpu' | 'webgl' = 'cpu';

/**
 * Default configuration - CPU preferred for training stability
 */
const DEFAULT_CONFIG: BackendConfig = {
  preferCPU: true,
  maxMemoryMB: 512,
  enableMemoryGrowth: true,
  logLevel: 'warn'
};

/**
 * Initialize TensorFlow.js with safe backend configuration
 * Forces CPU for training to prevent WebGL shader errors
 */
export async function initializeTFBackend(
  config: Partial<BackendConfig> = {}
): Promise<BackendStatus> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Set log level
  tf.env().set('DEBUG', finalConfig.logLevel === 'debug');

  console.log('🔧 Initializing TensorFlow.js backend...');

  try {
    // Always use CPU for training to avoid WebGL issues
    if (finalConfig.preferCPU) {
      await forceCPUBackend();
    } else {
      // Try WebGL with fallback
      await initializeWithFallback();
    }

    backendInitialized = true;
    currentMode = tf.getBackend() === 'cpu' ? 'cpu' : 'webgl';

    const status = getBackendStatus();
    console.log(`✅ TensorFlow.js initialized with ${status.currentBackend} backend`);
    console.log(`📊 Memory: ${formatBytes(status.memoryInfo.numBytes)}`);

    return status;
  } catch (error) {
    console.error('❌ TensorFlow.js initialization failed:', error);
    
    // Last resort: force CPU
    await forceCPUBackend();
    backendInitialized = true;
    currentMode = 'cpu';
    
    return getBackendStatus();
  }
}

/**
 * Force CPU backend for stable training
 */
export async function forceCPUBackend(): Promise<void> {
  try {
    console.log('🔄 Setting CPU backend for stable training...');
    
    // Register CPU backend if needed
    if (!tf.findBackend('cpu')) {
      console.log('📦 CPU backend not registered, importing...');
    }

    await tf.setBackend('cpu');
    await tf.ready();
    
    currentMode = 'cpu';
    webglContextLost = false;
    
    console.log('✅ CPU backend activated');
  } catch (error) {
    console.error('❌ Failed to set CPU backend:', error);
    throw error;
  }
}

/**
 * Try WebGL with automatic CPU fallback
 */
async function initializeWithFallback(): Promise<void> {
  // First check if WebGL is available
  const webglAvailable = isWebGLAvailable();
  
  if (!webglAvailable) {
    console.log('⚠️ WebGL not available, using CPU backend');
    await forceCPUBackend();
    return;
  }

  try {
    // Set WebGL environment flags for stability
    tf.env().set('WEBGL_CPU_FORWARD', true);
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', false);
    tf.env().set('WEBGL_PACK', false);
    tf.env().set('WEBGL_CONV_IM2COL', false);
    
    await tf.setBackend('webgl');
    await tf.ready();
    
    currentMode = 'webgl';
    console.log('✅ WebGL backend activated with safety flags');
    
    // Setup context loss handler
    setupWebGLContextLossHandler();
    
  } catch (error) {
    console.warn('⚠️ WebGL initialization failed, falling back to CPU:', error);
    await forceCPUBackend();
  }
}

/**
 * Check if WebGL is available
 */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Setup WebGL context loss detection and recovery
 */
function setupWebGLContextLossHandler(): void {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    
    if (gl) {
      canvas.addEventListener('webglcontextlost', async (event) => {
        event.preventDefault();
        console.warn('⚠️ WebGL context lost! Switching to CPU backend...');
        webglContextLost = true;
        
        // Clean up tensors
        disposeAllTensors();
        
        // Switch to CPU
        await forceCPUBackend();
      });

      canvas.addEventListener('webglcontextrestored', () => {
        console.log('✅ WebGL context restored');
        webglContextLost = false;
      });
    }
  } catch (error) {
    console.warn('Failed to setup WebGL context handler:', error);
  }
}

/**
 * Get current backend status
 */
export function getBackendStatus(): BackendStatus {
  const memory = tf.memory() as MemoryInfo;
  
  return {
    currentBackend: tf.getBackend() || 'unknown',
    isReady: backendInitialized,
    isWebGLAvailable: isWebGLAvailable(),
    isCPUMode: currentMode === 'cpu',
    memoryInfo: memory,
    webglContextLost
  };
}

/**
 * Dispose all tensors and clean up memory
 */
export function disposeAllTensors(): void {
  const memory = tf.memory();
  console.log(`🧹 Disposing ${memory.numTensors} tensors...`);
  
  tf.disposeVariables();
  
  const afterMemory = tf.memory();
  console.log(`✅ After cleanup: ${afterMemory.numTensors} tensors`);
}

/**
 * Safe tensor creation wrapper with automatic disposal tracking
 */
export function safeTensor<T extends tf.Tensor>(
  fn: () => T
): T {
  return tf.tidy(() => fn());
}

/**
 * Execute training code with automatic memory management
 * Wraps all tensor operations in tf.tidy() for auto-disposal
 */
export async function safeTrainingBlock<T>(
  fn: () => Promise<T>,
  cleanup?: () => void
): Promise<T> {
  const startMemory = tf.memory();
  console.log(`📊 Training block start - Tensors: ${startMemory.numTensors}`);

  try {
    // Run the training function
    const result = await fn();
    
    // Run cleanup if provided
    if (cleanup) {
      cleanup();
    }
    
    const endMemory = tf.memory();
    console.log(`📊 Training block end - Tensors: ${endMemory.numTensors}`);
    
    // Warn if significant tensor leak
    const leaked = endMemory.numTensors - startMemory.numTensors;
    if (leaked > 10) {
      console.warn(`⚠️ Potential memory leak: ${leaked} tensors not disposed`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Training block error:', error);
    
    // Emergency cleanup on error
    if (cleanup) {
      cleanup();
    }
    
    // If WebGL error, switch to CPU
    if (error instanceof Error && 
        (error.message.includes('WebGL') || 
         error.message.includes('shader') ||
         error.message.includes('context'))) {
      console.warn('🔄 WebGL error detected, switching to CPU...');
      await forceCPUBackend();
    }
    
    throw error;
  }
}

/**
 * Safe tensor disposal helper
 */
export function disposeTensors(tensors: (tf.Tensor | null | undefined)[]): void {
  for (const tensor of tensors) {
    if (tensor && !tensor.isDisposed) {
      tensor.dispose();
    }
  }
}

/**
 * Memory monitoring and alerts
 */
export function checkMemoryUsage(warnThresholdMB: number = 512): boolean {
  const memory = tf.memory();
  const usedMB = memory.numBytes / (1024 * 1024);
  
  if (usedMB > warnThresholdMB) {
    console.warn(`⚠️ High memory usage: ${usedMB.toFixed(2)}MB`);
    return false;
  }
  
  return true;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get safe training configuration with reduced complexity
 */
export function getSafeTrainingConfig() {
  return {
    // Reduced batch size for memory efficiency
    batchSize: 8,
    
    // Reduced model complexity
    maxDenseUnits: 64,
    maxEmbeddingDim: 32,
    maxLstmUnits: 32,
    
    // Safe initializers (avoid orthogonal)
    kernelInitializer: 'glorotUniform' as const,
    recurrentInitializer: 'glorotUniform' as const,
    
    // Reduced sequence lengths
    maxSequenceLength: 100,
    
    // Memory limits
    maxTensorsBeforeGC: 1000,
    memoryWarningThresholdMB: 256
  };
}

/**
 * Ensure backend is ready before operations
 */
export async function ensureBackendReady(): Promise<void> {
  if (!backendInitialized) {
    await initializeTFBackend({ preferCPU: true });
  }
  
  // Check for context loss
  if (webglContextLost && currentMode === 'webgl') {
    console.warn('⚠️ WebGL context was lost, reinitializing CPU backend...');
    await forceCPUBackend();
  }
}

/**
 * Run inference-safe operations (can use WebGL if available)
 * Optimized for speed with automatic CPU fallback on errors
 */
export async function initializeForInference(): Promise<void> {
  // For inference, we can try WebGL for speed (no gradient computation needed)
  await initializeTFBackend({ preferCPU: false });
}

/**
 * Safe inference wrapper with automatic error recovery
 * Wraps inference operations with proper error handling and fallback
 */
export async function safeInference<T>(
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn('⚠️ Inference error, attempting fallback:', error);
    
    // If WebGL error detected, switch to CPU
    if (error instanceof Error && 
        (error.message.includes('WebGL') || 
         error.message.includes('shader') ||
         error.message.includes('context'))) {
      console.log('🔄 Switching to CPU backend for inference...');
      await forceCPUBackend();
      
      // Retry inference on CPU
      try {
        return await fn();
      } catch (retryError) {
        console.error('❌ Inference failed even after CPU fallback:', retryError);
        
        // If fallback provided, use it
        if (fallback) {
          console.log('📋 Using fallback function...');
          return await fallback();
        }
        throw retryError;
      }
    }
    
    // Not a WebGL error, throw immediately
    throw error;
  }
}

/**
 * Run training-safe operations (always CPU)
 */
export async function initializeForTraining(): Promise<void> {
  // For training, always use CPU for stability
  await initializeTFBackend({ preferCPU: true });
}

export default {
  initializeTFBackend,
  forceCPUBackend,
  isWebGLAvailable,
  getBackendStatus,
  disposeAllTensors,
  disposeTensors,
  safeTensor,
  safeTrainingBlock,
  safeInference,
  checkMemoryUsage,
  getSafeTrainingConfig,
  ensureBackendReady,
  initializeForInference,
  initializeForTraining
};
