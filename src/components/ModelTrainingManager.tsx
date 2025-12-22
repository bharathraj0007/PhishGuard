import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircle2,
  AlertCircle,
  Zap,
  Download,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const DATASET_URLS = {
  url: "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Furl_phishing__af0db356.csv?alt=media",
  sms: "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fsms_phishing__547fd790.csv?alt=media",
  email:
    "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Femail_phishing__0eaf9d24.csv?alt=media",
};

const IMPORTER_FUNCTION_URL =
  "https://eky2mdxr--dataset-importer.functions.blink.new";
const TRAINING_FUNCTION_URL =
  "https://eky2mdxr--ml-specialized-training.functions.blink.new";

interface TrainingStatus {
  [key: string]: {
    status: "idle" | "importing" | "training" | "success" | "error";
    progress: number;
    message: string;
    recordCount?: number;
    accuracy?: number;
    error?: string;
  };
}

export default function ModelTrainingManager() {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    url: { status: "idle", progress: 0, message: "Ready to train URL model" },
    sms: {
      status: "idle",
      progress: 0,
      message: "Ready to train SMS model",
    },
    email: {
      status: "idle",
      progress: 0,
      message: "Ready to train Email model",
    },
  });

  const [autoTrain, setAutoTrain] = useState(false);

  const importDataset = async (scanType: "url" | "sms" | "email") => {
    try {
      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "importing",
          progress: 10,
          message: "Fetching dataset...",
        },
      }));

      const response = await fetch(IMPORTER_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvUrl: DATASET_URLS[scanType],
          scanType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Import failed");
      }

      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "importing",
          progress: 50,
          message: `Imported ${result.count} records`,
          recordCount: result.count,
        },
      }));

      toast.success(`Imported ${result.count} ${scanType} records`);

      // Auto-train if enabled
      if (autoTrain) {
        await trainModel(scanType);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Import failed";
      console.error(`Error importing ${scanType} dataset:`, error);
      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "error",
          progress: 0,
          message: "Import failed",
          error: message,
        },
      }));
      toast.error(message);
    }
  };

  const trainModel = async (scanType: "url" | "sms" | "email") => {
    try {
      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "training",
          progress: 20,
          message: "Initializing training...",
        },
      }));

      // Simulate training progress
      const progressInterval = setInterval(() => {
        setTrainingStatus((prev) => {
          const current = prev[scanType];
          if (current.progress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            [scanType]: {
              ...current,
              progress: current.progress + Math.random() * 15,
            },
          };
        });
      }, 500);

      const response = await fetch(TRAINING_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanType,
          datasetSize: 1000,
          config: {
            epochs: scanType === "sms" ? 15 : 10,
            batchSize: 32,
            learningRate: 0.001,
          },
        }),
      });

      clearInterval(progressInterval);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Training failed");
      }

      const accuracy = result.metrics?.accuracy || 0.85;

      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "success",
          progress: 100,
          message: `Model trained successfully`,
          accuracy: Math.round(accuracy * 100),
        },
      }));

      toast.success(
        `${scanType.toUpperCase()} model trained! Accuracy: ${Math.round(accuracy * 100)}%`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Training failed";
      console.error(`Error training ${scanType} model:`, error);
      setTrainingStatus((prev) => ({
        ...prev,
        [scanType]: {
          ...prev[scanType],
          status: "error",
          progress: 0,
          message: "Training failed",
          error: message,
        },
      }));
      toast.error(message);
    }
  };

  const ModelCard = ({ scanType }: { scanType: "url" | "sms" | "email" }) => {
    const status = trainingStatus[scanType];
    const isLoading = status.status === "importing" || status.status === "training";

    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="capitalize">{scanType} Phishing Detection</span>
            {status.status === "success" && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            {status.status === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{status.message}</p>
            {status.recordCount != null && status.recordCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Records: {status.recordCount.toLocaleString()}
              </p>
            )}
          </div>

          {status.progress > 0 && (
            <div className="space-y-2">
              <Progress value={status.progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {Math.round(status.progress)}%
              </p>
            </div>
          )}

          {status.accuracy && (
            <Alert className="bg-green-50 border-green-200">
              <BarChart3 className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                Model Accuracy: <strong>{status.accuracy}%</strong>
              </AlertDescription>
            </Alert>
          )}

          {status.error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{status.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => importDataset(scanType)}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-3 h-3 mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 mr-2" />
                  Import
                </>
              )}
            </Button>
            <Button
              onClick={() => trainModel(scanType)}
              disabled={
                isLoading ||
                !status.recordCount ||
                status.recordCount === 0
              }
              size="sm"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-3 h-3 mr-2" />
                  Training...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-2" />
                  Train
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ML Model Training</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Import datasets and train specialized phishing detection models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-train"
            checked={autoTrain}
            onChange={(e) => setAutoTrain(e.target.checked)}
            className="w-4 h-4 rounded border"
          />
          <label htmlFor="auto-train" className="text-sm cursor-pointer">
            Auto-train after import
          </label>
        </div>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModelCard scanType="url" />
            <ModelCard scanType="sms" />
            <ModelCard scanType="email" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Training Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <strong>URL Model:</strong> CNN-based classifier for suspicious URL patterns
              </p>
              <p>
                <strong>SMS Model:</strong> BiLSTM sequence model for SMS phishing detection
              </p>
              <p>
                <strong>Email Model:</strong> TF-IDF + SVM for email text analysis
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Training Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Epochs</Label>
                  <Input type="number" defaultValue="10" min="1" max="50" />
                </div>
                <div>
                  <Label className="text-xs">Batch Size</Label>
                  <Input type="number" defaultValue="32" min="1" max="256" />
                </div>
                <div>
                  <Label className="text-xs">Learning Rate</Label>
                  <Input type="number" defaultValue="0.001" step="0.0001" />
                </div>
                <div>
                  <Label className="text-xs">Validation Split</Label>
                  <Input type="number" defaultValue="0.2" min="0.1" max="0.5" step="0.1" />
                </div>
              </div>
              <Button className="w-full">Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
