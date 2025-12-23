import * as tf from "npm:@tensorflow/tfjs-node@4.22.0";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// CORS headers - Required for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

// Global variables for model and vocabulary
let model: tf.GraphModel | null = null;
let vocabMap: Map<string, number> | null = null;
let isInitialized = false;

// Constants
const MAX_SEQUENCE_LENGTH = 160;
const PHISHING_THRESHOLD = 0.5;

/**
 * Load vocabulary from vocab.txt file
 */
function loadVocabulary(): Map<string, number> {
  const vocabPath = join(Deno.cwd(), "functions/sms-ml-detector/models/vocab.txt");
  const vocabContent = readFileSync(vocabPath, "utf-8");
  const lines = vocabContent.split("\n").filter(line => line.trim() !== "");
  
  const vocab = new Map<string, number>();
  lines.forEach((word, index) => {
    vocab.set(word.trim().toLowerCase(), index);
  });
  
  console.log(`Loaded vocabulary with ${vocab.size} words`);
  return vocab;
}

/**
 * Initialize model and vocabulary
 */
async function initialize() {
  if (isInitialized) return;
  
  try {
    console.log("Initializing SMS ML Detector...");
    
    // Load vocabulary
    vocabMap = loadVocabulary();
    
    // Load TensorFlow SavedModel
    const modelPath = `file://${join(Deno.cwd(), "functions/sms-ml-detector/models")}`;
    console.log("Loading model from:", modelPath);
    model = await tf.loadGraphModel(modelPath);
    console.log("Model loaded successfully");
    
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize:", error);
    throw error;
  }
}

/**
 * Preprocess SMS text
 * - Convert to lowercase
 * - Remove URLs
 * - Remove phone numbers
 * - Tokenize by spaces
 * - Convert to integer sequence
 * - Pad/truncate to MAX_SEQUENCE_LENGTH
 */
function preprocessSMS(text: string): number[] {
  if (!vocabMap) {
    throw new Error("Vocabulary not loaded");
  }
  
  // Convert to lowercase
  let processed = text.toLowerCase();
  
  // Remove URLs (http://, https://, www., etc.)
  processed = processed.replace(/https?:\/\/\S+/g, "");
  processed = processed.replace(/www\.\S+/g, "");
  processed = processed.replace(/\S+\.(com|org|net|edu|gov|co\.uk|io)\S*/g, "");
  
  // Remove phone numbers (various formats)
  processed = processed.replace(/\+?\d[\d\s\-\(\)\.]{7,}\d/g, "number");
  processed = processed.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "number");
  
  // Tokenize by spaces and clean
  const tokens = processed
    .split(/\s+/)
    .map(token => token.replace(/[^\w]/g, ""))
    .filter(token => token.length > 0);
  
  // Convert tokens to indices
  const unkIndex = vocabMap.get("[unk]") || 1;
  const sequence = tokens.map(token => {
    return vocabMap!.get(token) || unkIndex;
  });
  
  // Pad or truncate to MAX_SEQUENCE_LENGTH
  if (sequence.length < MAX_SEQUENCE_LENGTH) {
    // Pad with zeros
    while (sequence.length < MAX_SEQUENCE_LENGTH) {
      sequence.push(0);
    }
  } else if (sequence.length > MAX_SEQUENCE_LENGTH) {
    // Truncate
    sequence.splice(MAX_SEQUENCE_LENGTH);
  }
  
  return sequence;
}

/**
 * Run inference on preprocessed SMS
 */
async function predictPhishing(sequence: number[]): Promise<number> {
  if (!model) {
    throw new Error("Model not loaded");
  }
  
  // Create tensor with shape [1, 160]
  const inputTensor = tf.tensor2d([sequence], [1, MAX_SEQUENCE_LENGTH], "int32");
  
  try {
    // Run inference
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const score = (await prediction.data())[0];
    
    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();
    
    return score;
  } catch (error) {
    inputTensor.dispose();
    throw error;
  }
}

/**
 * Main handler
 */
async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight - return 200 with CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }
  
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    // Initialize on first request
    if (!isInitialized) {
      await initialize();
    }
    
    // Parse request body
    const body = await req.json();
    const { text, message } = body;
    
    // Accept both 'text' and 'message' field names for compatibility
    const smsText = text || message;
    
    if (!smsText || typeof smsText !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' or 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (smsText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "SMS text cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Processing SMS:", smsText.substring(0, 50) + "...");
    
    // Preprocess SMS
    const sequence = preprocessSMS(smsText);
    console.log("Preprocessed sequence length:", sequence.length);
    console.log("First 10 tokens:", sequence.slice(0, 10));
    
    // Run inference
    const score = await predictPhishing(sequence);
    console.log("Model score:", score);
    
    // Classify
    const label = score > PHISHING_THRESHOLD ? "PHISHING" : "SAFE";
    const confidence = score > 0.5 ? score : 1 - score;
    
    return new Response(
      JSON.stringify({
        label,
        confidence: Number(confidence.toFixed(4)),
        score: Number(score.toFixed(4)),
        text: smsText.substring(0, 100) // Return first 100 chars for verification
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Error processing SMS:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process SMS",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}

Deno.serve(handler);
