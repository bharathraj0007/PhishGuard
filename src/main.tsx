import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
// import { initializeMLService } from './lib/ml/prediction-service'

// Initialize ML service in background (non-blocking)
// NOTE: Requires TensorFlow.js packages to be installed first
// Run: npm install @tensorflow/tfjs @tensorflow-models/universal-sentence-encoder
// initializeMLService().catch(err => {
//   console.warn('ML service initialization deferred:', err);
// });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster position="top-right" />
    <App />
  </React.StrictMode>,
) 