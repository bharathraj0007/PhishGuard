import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";

interface PopulationStatus {
  type: "url" | "sms" | "email";
  status: "pending" | "loading" | "completed" | "error";
  message: string;
  recordsInserted?: number;
  error?: string;
}

const CSV_URLS = {
  url: "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Furl_phishing__af0db356.csv?alt=media&token=6c7f06c8-8fa9-4154-8a62-95441d251708",
  sms: "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fsms_phishing__547fd790.csv?alt=media&token=ec835f9c-7468-4f22-9324-521524c3357e",
  email:
    "https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Femail_phishing__0eaf9d24.csv?alt=media&token=b1421b1a-4884-4180-baff-524614a473d8",
};

export function CSVDataPopulation() {
  const [statuses, setStatuses] = useState<PopulationStatus[]>([
    { type: "url", status: "pending", message: "Ready to import" },
    { type: "sms", status: "pending", message: "Ready to import" },
    { type: "email", status: "pending", message: "Ready to import" },
  ]);

  const updateStatus = (
    type: "url" | "sms" | "email",
    updates: Partial<PopulationStatus>
  ) => {
    setStatuses((prev) =>
      prev.map((s) => (s.type === type ? { ...s, ...updates } : s))
    );
  };

  const populateDataset = async (type: "url" | "sms" | "email") => {
    try {
      updateStatus(type, {
        status: "loading",
        message: `Importing ${type.toUpperCase()} phishing data...`,
      });

      const response = await fetch(
        "https://eky2mdxr--csv-dataset-loader.functions.blink.new",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dataset_type: type,
            csv_url: CSV_URLS[type],
            dataset_name: `${type}_phishing_training_dataset`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import dataset");
      }

      updateStatus(type, {
        status: "completed",
        message: `Successfully imported ${data.records_inserted} records`,
        recordsInserted: data.records_inserted,
      });

      toast.success(
        `${type.toUpperCase()} dataset: ${data.records_inserted} records imported`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      updateStatus(type, {
        status: "error",
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      });

      toast.error(`Failed to import ${type.toUpperCase()} dataset: ${errorMessage}`);
    }
  };

  const populateAll = async () => {
    for (const type of ["url", "sms", "email"] as const) {
      await populateDataset(type);
      // Add delay between imports
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          CSV Dataset Population
        </h3>

        <div className="space-y-3 mb-6">
          {statuses.map((status) => (
            <div
              key={status.type}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium capitalize">{status.type} Dataset</p>
                <p className="text-sm text-gray-500">{status.message}</p>
                {status.recordsInserted && (
                  <p className="text-sm text-green-600">
                    {status.recordsInserted.toLocaleString()} records imported
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {status.status === "loading" && <Spinner className="h-5 w-5" />}
                {status.status === "completed" && (
                  <span className="text-green-600">✓</span>
                )}
                {status.status === "error" && (
                  <span className="text-red-600">✕</span>
                )}
                {status.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => populateDataset(status.type)}
                    disabled={statuses.some((s) => s.status === "loading")}
                  >
                    Import
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={populateAll}
          className="w-full"
          disabled={statuses.some((s) => s.status === "loading")}
        >
          {statuses.some((s) => s.status === "loading")
            ? "Populating..."
            : "Populate All Datasets"}
        </Button>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Info:</strong> This will import training data from the CSV
          files. URL dataset has ~11,430 records, SMS has ~2,000 records, and
          Email dataset will be imported from its CSV file.
        </p>
      </Card>
    </div>
  );
}
