import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const KAGGLE_EXTENDED_API = "https://eky2mdxr--kaggle-extended-records.functions.blink.new";

interface GenerationResult {
  type: string;
  datasetId: string;
  recordsInserted: number;
  status: string;
}

export function KaggleExtendedDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recordCount, setRecordCount] = useState(500);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<GenerationResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRecords = async (type?: string) => {
    try {
      setIsGenerating(true);
      setLoading(true);

      const payload = {
        action: "generate_extended",
        count: recordCount,
        ...(type && { type }),
      };

      console.log("Generating extended Kaggle records...", payload);

      const response = await fetch(KAGGLE_EXTENDED_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate records");
      }

      const data = await response.json();

      if (data.success) {
        setLastResults(data.results || []);
        toast.success(`✓ Generated ${data.totalRecords} training records successfully!`);
        console.log("Generation complete:", data);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error generating records:", error);
      toast.error(`✗ Failed: ${message}`);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const handleGenerateAll = () => {
    generateRecords();
  };

  const handleGenerateType = (type: string) => {
    setSelectedType(type);
    generateRecords(type);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span> Kaggle Extended Data Generator
          </CardTitle>
          <CardDescription>
            Generate realistic phishing and legitimate training samples for all detection types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Info Alert */}
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              This will generate realistic phishing and legitimate samples for training ML models.
              Each call creates new training records with authentic indicators and patterns.
            </AlertDescription>
          </Alert>

          {/* Configuration Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recordCount" className="text-sm font-semibold">
                Records per Detection Type
              </Label>
              <div className="flex gap-2">
                <Input
                  id="recordCount"
                  type="number"
                  min={100}
                  max={5000}
                  step={100}
                  value={recordCount}
                  onChange={(e) => setRecordCount(Math.max(100, parseInt(e.target.value) || 500))}
                  className="max-w-xs"
                  disabled={isGenerating}
                />
                <span className="text-xs text-muted-foreground mt-2.5">
                  (Total will be: {recordCount * 4} records for all types)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="text-xs bg-muted p-2 rounded">
                <div className="font-semibold text-primary">URL</div>
                <div>{recordCount} records</div>
              </div>
              <div className="text-xs bg-muted p-2 rounded">
                <div className="font-semibold text-primary">Email</div>
                <div>{recordCount} records</div>
              </div>
              <div className="text-xs bg-muted p-2 rounded">
                <div className="font-semibold text-primary">SMS</div>
                <div>{recordCount} records</div>
              </div>
              <div className="text-xs bg-muted p-2 rounded">
                <div className="font-semibold text-primary">QR</div>
                <div>{recordCount} records</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Types</TabsTrigger>
              <TabsTrigger value="individual">Individual Types</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate {recordCount} records for all detection types at once
              </p>
              <Button
                onClick={handleGenerateAll}
                disabled={isGenerating}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate All ({recordCount * 4} total)"
                )}
              </Button>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate {recordCount} records for each specific type
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { type: "url", emoji: "🔗", label: "URL Records" },
                  { type: "email", emoji: "📧", label: "Email Records" },
                  { type: "sms", emoji: "📱", label: "SMS Records" },
                  { type: "qr", emoji: "📱", label: "QR Code Records" },
                ].map(({ type, emoji, label }) => (
                  <Button
                    key={type}
                    onClick={() => handleGenerateType(type)}
                    disabled={isGenerating}
                    variant={selectedType === type ? "default" : "outline"}
                    className="justify-start"
                  >
                    {selectedType === type && isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="mr-2">{emoji}</span>
                    )}
                    {label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Results Section */}
          {lastResults && lastResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  Generation Complete
                </h3>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {lastResults.map((result) => (
                  <Card key={result.type} className="bg-muted">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold capitalize text-sm">{result.type}</span>
                        <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded text-xs">
                          {result.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>Records: {result.recordsInserted}</div>
                        <div className="mt-1 break-all">ID: {result.datasetId.substring(0, 30)}...</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  All records have been successfully inserted into the training_records table.
                  You can now use these records to train ML models.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Feature Details */}
          <div className="grid gap-4 mt-6">
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>Realistic phishing URLs with typosquatting and homograph attacks</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>Authentic email phishing content with spoofing patterns</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>SMS phishing messages with urgency and monetary patterns</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>QR code links with phishing and legitimate URLs</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>40% phishing / 60% legitimate distribution</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">✓</span>
                  <span>Real-world phishing indicators and threat levels</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• Start with 500 records per type to test</div>
                <div>• Generate multiple times to build larger training dataset</div>
                <div>• Use 1000+ records per type for better ML model accuracy</div>
                <div>• Check database directly to verify record insertion</div>
                <div>• Each call creates a new dataset entry with unique ID</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
