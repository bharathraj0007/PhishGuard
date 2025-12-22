import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertCircle, CheckCircle2, Clock, Database } from "lucide-react";
import { toast } from "sonner";

interface DatasetStatus {
  id: string;
  name: string;
  expectedCount: number;
  actualCount: number;
  populated: boolean;
  percentage: number;
}

export function DatasetPopulationStatus() {
  const [datasets, setDatasets] = useState<DatasetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);

  const expectedCounts = {
    ds_phishing_urls: { name: "Phishing URLs Dataset", count: 15000 },
    ds_phishing_emails: { name: "Email Phishing Dataset", count: 8500 },
    ds_sms_phishing: { name: "SMS Phishing Dataset", count: 5200 },
    ds_qr_phishing: { name: "QR Code Phishing Dataset", count: 3800 },
    ds_kaggle_urls: { name: "Kaggle Phishing URLs", count: 11000 },
    ds_custom_training: { name: "Custom Training Set", count: 4200 },
  };

  const checkDatasetStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/admin/dataset-status",
        { method: "GET" }
      );

      if (!response.ok) throw new Error("Failed to fetch status");

      const data = await response.json();
      const statusData = data.datasets.map(
        (d: { id: string; actualCount: number }) => ({
          id: d.id,
          name:
            expectedCounts[d.id as keyof typeof expectedCounts]?.name ||
            d.id,
          expectedCount:
            expectedCounts[d.id as keyof typeof expectedCounts]?.count || 0,
          actualCount: d.actualCount,
          populated: d.actualCount > 0,
          percentage: Math.min(
            100,
            Math.round(
              (d.actualCount /
                (expectedCounts[d.id as keyof typeof expectedCounts]
                  ?.count || 1)) *
                100
            )
          ),
        })
      );

      setDatasets(statusData);
    } catch (error) {
      console.error("Error checking status:", error);
      toast.error("Failed to fetch dataset status");
    } finally {
      setLoading(false);
    }
  };

  const startPopulation = async () => {
    try {
      setPopulating(true);
      toast.loading("Starting dataset population...");

      const response = await fetch(
        "/api/admin/populate-datasets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        }
      );

      if (!response.ok) throw new Error("Population failed");

      toast.success("Dataset population completed!");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await checkDatasetStatus();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to populate datasets");
    } finally {
      setPopulating(false);
    }
  };

  useEffect(() => {
    checkDatasetStatus();
    const interval = setInterval(checkDatasetStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const totalExpected = Object.values(expectedCounts).reduce(
    (sum, d) => sum + d.count,
    0
  );
  const totalActual = datasets.reduce((sum, d) => sum + d.actualCount, 0);
  const overallPercentage = Math.round((totalActual / totalExpected) * 100);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dataset Population Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total Records: {totalActual.toLocaleString()} /
                {totalExpected.toLocaleString()}
              </span>
              <span className="text-sm font-bold">{overallPercentage}%</span>
            </div>
            <Progress value={overallPercentage} className="h-2" />
          </div>

          {overallPercentage < 100 && (
            <Button
              onClick={startPopulation}
              disabled={populating}
              className="w-full"
            >
              {populating ? "Populating..." : "Start Population"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Individual Dataset Status */}
      <div className="grid gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Loading dataset status...
          </div>
        ) : (
          datasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dataset.name}</CardTitle>
                  {dataset.populated ? (
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50">
                      <AlertCircle className="w-3 h-3 mr-1 text-yellow-600" />
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Records: {dataset.actualCount.toLocaleString()} /
                      {dataset.expectedCount.toLocaleString()}
                    </span>
                    <span className="font-semibold text-primary">
                      {dataset.percentage}%
                    </span>
                  </div>
                  <Progress value={dataset.percentage} className="h-2" />
                  {dataset.actualCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {dataset.expectedCount - dataset.actualCount > 0
                        ? `${(dataset.expectedCount - dataset.actualCount).toLocaleString()} more records needed`
                        : "Dataset complete"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dataset Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dataset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3 text-muted-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-foreground">Phishing URLs</p>
                <p>15,000 URL records for model training</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Email Phishing</p>
                <p>8,500 email samples with indicators</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">SMS Phishing</p>
                <p>5,200 SMS messages labeled</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">QR Codes</p>
                <p>3,800 phishing QR code records</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Kaggle URLs</p>
                <p>11,000 public dataset records</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Custom Set</p>
                <p>4,200 specialized training records</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="font-semibold text-foreground mb-2">
                Total Training Records
              </p>
              <p className="text-lg font-bold text-primary">
                {totalExpected.toLocaleString()} records
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
