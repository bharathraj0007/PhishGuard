/**
 * URL Model Loader for TensorFlow.js
 * Loads pre-trained Character-level CNN model for URL phishing detection
 * Model: input [1, 200], output: sigmoid (0-1)
 */

import * as tf from '@tensorflow/tfjs';

export interface URLModelPrediction {
  score: number;
  isPhishing: boolean;
  confidence: number;
}

export class URLModelLoader {
  private static instance: URLModelLoader;
  private model: tf.GraphModel | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<tf.GraphModel> | null = null;

  private constructor() {}

  static getInstance(): URLModelLoader {
    if (!URLModelLoader.instance) {
      URLModelLoader.instance = new URLModelLoader();
    }
    return URLModelLoader.instance;
  }

  /**
   * Load the TensorFlow.js model
   * Returns cached model if already loaded
   */
  async loadModel(): Promise<tf.GraphModel> {
    // Return cached model if already loaded
    if (this.model) {
      return this.model;
    }

    // Return existing promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start new load
    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log('Loading URL phishing detection model...');
        const modelPath = '/models/url/model.json';
        this.model = (await tf.loadGraphModel(modelPath)) as tf.GraphModel;
        console.log('URL model loaded successfully');
        return this.model;
      } catch (error) {
        console.error('Failed to load URL model:', error);
        this.model = null;
        this.loadPromise = null;
        throw new Error(`Failed to load URL model: ${error}`);
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Encode URL string to character indices (capped at 127)
   * Returns array of length 200 (padded with 0 if shorter, trimmed if longer)
   */
  private encodeURL(url: string): number[] {
    const encoded: number[] = [];

    // Encode each character using charCodeAt, capped at 127
    for (let i = 0; i < url.length && i < 200; i++) {
      const code = url.charCodeAt(i);
      encoded.push(Math.min(code, 127));
    }

    // Pad with zeros to reach length 200
    while (encoded.length < 200) {
      encoded.push(0);
    }

    return encoded;
  }

  /**
   * Predict phishing probability for a URL
   * Returns score (0-1), boolean flag, and confidence
   */
  async predict(url: string): Promise<URLModelPrediction> {
    try {
      // Load model if not already loaded
      if (!this.model) {
        await this.loadModel();
      }

      if (!this.model) {
        throw new Error('Model failed to load');
      }

      // Encode URL to character indices
      const encoded = this.encodeURL(url);

      // Create tensor [1, 200]
      const input = tf.tensor2d([encoded], [1, 200], 'float32');

      try {
        // Run inference
        const output = this.model.predict(input) as tf.Tensor;

        try {
          // Extract score (0-1)
          const scoreArray = await output.data();
          const score = scoreArray[0];

          // Determine if phishing: score > 0.5
          const isPhishing = score > 0.5;

          // Confidence is distance from decision boundary (0.5)
          const confidence = Math.abs(score - 0.5) * 2;

          console.log(`URL prediction - Score: ${score.toFixed(4)}, Phishing: ${isPhishing}`);

          return {
            score,
            isPhishing,
            confidence
          };
        } finally {
          output.dispose();
        }
      } finally {
        input.dispose();
      }
    } catch (error) {
      console.error('Error during URL prediction:', error);
      throw error;
    }
  }

  /**
   * Batch predict for multiple URLs
   */
  async predictBatch(urls: string[]): Promise<URLModelPrediction[]> {
    const results: URLModelPrediction[] = [];

    for (const url of urls) {
      const prediction = await this.predict(url);
      results.push(prediction);
    }

    return results;
  }

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.loadPromise = null;
    this.isLoading = false;
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.model !== null;
  }

  /**
   * Get loading status
   */
  getLoadingStatus(): {
    isLoading: boolean;
    isLoaded: boolean;
  } {
    return {
      isLoading: this.isLoading,
      isLoaded: this.model !== null
    };
  }
}

// Export singleton instance
export const urlModelLoader = URLModelLoader.getInstance();
