import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export const toolConfig = {
  name: "JSON to .env",
  description: "Convert JSON to environment variables format",
};

export default function JsonToEnvConverter() {
  const [jsonInput, setJsonInput] = useState("");
  const [envOutput, setEnvOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const convertToEnv = () => {
    setError("");
    setEnvOutput("");

    if (!jsonInput.trim()) {
      setError("Please enter JSON data");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      const envLines = Object.entries(parsed).map(([key, value]) => {
        let formattedValue = value;

        if (typeof value === "string") {
          if (value.includes(" ") || value.includes("#")) {
            formattedValue = `"${value}"`;
          }
        } else if (typeof value === "object" && value !== null) {
          formattedValue = JSON.stringify(value);
        }

        return `${key}=${formattedValue}`;
      });

      setEnvOutput(envLines.join("\n"));
    } catch (e) {
      setError("Invalid JSON format. Please check your input.");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(envOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            JSON to .env Converter
          </h1>
          <p className="text-gray-600 mb-6">
            Paste your JSON data and convert it to .env format
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON Input
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"API_KEY": "your-key", "DATABASE_URL": "localhost"}'
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={convertToEnv}
                className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Convert to .env
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  .env Output
                </label>
                {envOutput && (
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                value={envOutput}
                readOnly
                placeholder="Your .env output will appear here..."
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Example</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Input JSON:
              </p>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                {`{
  "API_KEY": "abc123xyz",
  "DATABASE_URL": "localhost:5432",
  "DEBUG": "true"
}`}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Output .env:
              </p>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                {`API_KEY=abc123xyz
DATABASE_URL=localhost:5432
DEBUG=true`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
