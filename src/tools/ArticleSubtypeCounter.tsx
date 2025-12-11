import { useState } from "react";
import {
  BarChart3,
  Copy,
  Upload,
  Calendar,
  FileText,
  Check,
} from "lucide-react";

export const toolConfig = {
  name: "Article Subtype Counter",
  description:
    "Analyze and visualize article subtypes by date range with GROQ query integration",
};

interface CountData {
  countMap: Record<string, number>;
  chartData: Array<{
    subtype: string;
    count: number;
    code: string;
  }>;
  total: number;
}

export default function ArticleSubtypeCounter() {
  const [groqResults, setGroqResults] = useState("");
  const [counts, setCounts] = useState<CountData | null>(null);
  const [error, setError] = useState("");
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [copiedList, setCopiedList] = useState(false);

  // Query configuration
  const [articleType, setArticleType] = useState<
    "freeArticle" | "premiumArticle" | "both"
  >("freeArticle");
  const [startDate, setStartDate] = useState("2025-10-01");
  const [endDate, setEndDate] = useState("2025-11-01");

  // Mapping of subtype codes to readable names
  const subtypeNames: Record<string, string> = {
    // Free article subtypes
    freeEarningsSummary: "Free Earnings Summary",
    freeConferenceCallSummary: "Free Conference Call Summary",
    earningsLeadershipHighlights: "Earnings Leadership Highlights",
    etfComparison: "ETF Comparison",
    insiderTrading: "Insider Trading",
    institutionalOwnership: "Institutional Ownership",
    whatIfInvestment: "What If Investment",
    // Premium article subtypes
    newsamatic: "Newsamatic",
    premiumEarningsSummary: "Premium Earnings Summary",
    aipReport: "AIP Report",
    bullBear: "Bull Bear",
    groupsamatic: "Groupsamatic",
    premiumConferenceCallSummary: "Premium Conference Call Summary",
    fool24Summary: "Fool 24 Summary",
    basic: "Basic",
  };

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#6366f1",
    "#f43f5e",
    "#14b8a6",
    "#f97316",
    "#a855f7",
    "#84cc16",
  ];

  const generateQuery = () => {
    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T00:00:00Z`;

    if (articleType === "both") {
      return `*[(_type == "freeArticle" || _type == "premiumArticle") && publishDate >= "${startDateTime}" && publishDate < "${endDateTime}"] { _type, articleSubType }`;
    } else {
      return `*[_type == "${articleType}" && publishDate >= "${startDateTime}" && publishDate < "${endDateTime}"] { articleSubType }`;
    }
  };

  const handleCopyQuery = async () => {
    const query = generateQuery();
    await navigator.clipboard.writeText(query);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleCopyList = async () => {
    if (!counts) return;
    const text = counts.chartData
      .map((item) => `${item.subtype}: ${item.count}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setGroqResults(text);
        setError("");
      } catch (err) {
        setError("Error reading file. Please try again.");
      }
    }
  };

  const processResults = () => {
    try {
      setError("");
      const parsed = JSON.parse(groqResults);

      if (!Array.isArray(parsed)) {
        setError("Expected an array of articles from GROQ query");
        return;
      }

      interface Article {
        articleSubType?: string;
        _type?: string;
      }

      // Count by subtype
      const countMap = parsed.reduce(
        (acc: Record<string, number>, article: Article) => {
          const subtype = article.articleSubType || "unspecified";
          const typePrefix =
            articleType === "both"
              ? `[${article._type === "freeArticle" ? "Free" : "Premium"}] `
              : "";
          const key = typePrefix + subtype;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {}
      );

      // Convert to array for charts
      const chartData = Object.entries(countMap)
        .map(([subtype, count]) => {
          const cleanSubtype = subtype.replace(/^\[(Free|Premium)\] /, "");
          const displayName = subtypeNames[cleanSubtype] || cleanSubtype;
          const prefix = subtype.match(/^\[(Free|Premium)\] /)
            ? subtype.match(/^\[(Free|Premium)\] /)![0]
            : "";

          return {
            subtype: prefix + displayName,
            count: count as number,
            code: subtype,
          };
        })
        .sort((a, b) => b.count - a.count);

      const total = parsed.length;

      setCounts({ countMap, chartData, total });
    } catch (err) {
      setError("Invalid JSON. Please paste the results from your GROQ query.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">
            Article Subtype Counter
          </h1>
        </div>
        <p className="text-gray-600 mb-8">
          Analyze articles by subtype and date range using GROQ queries
        </p>

        {/* Configuration Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Configure Query
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article Type
              </label>
              <select
                value={articleType}
                onChange={(e) => setArticleType(e.target.value as "freeArticle" | "premiumArticle" | "both")}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="freeArticle">Free Articles</option>
                <option value="premiumArticle">Premium Articles</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Generated GROQ Query
            </label>
            <div className="bg-white rounded-lg p-4 relative border border-gray-200 min-h-20">
              <code className="text-sm text-gray-700 break-all block pr-32 font-mono leading-relaxed">
                {generateQuery()}
              </code>
              <button
                type="button"
                onClick={handleCopyQuery}
                className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                {copiedQuery ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload or Paste Results
          </h2>

          <div className="mb-4">
            <label className="block w-full">
              <input
                type="file"
                accept=".json,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <p className="font-medium text-gray-700">
                  Click to upload a file
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  JSON or TXT files accepted
                </p>
              </div>
            </label>
          </div>

          <div className="text-center text-gray-500 text-sm mb-4">- OR -</div>

          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            placeholder='Paste your GROQ query results here (e.g., [{"articleSubType": "freeEarningsSummary"}, ...])'
            value={groqResults}
            onChange={(e) => setGroqResults(e.target.value)}
          />

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
              <span className="font-medium">⚠</span>
              {error}
            </div>
          )}

          <button
            onClick={processResults}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Process Results
          </button>
        </div>

        {/* Results Section */}
        {counts && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-sm font-medium mb-2 opacity-90">
                  Total Articles
                </h3>
                <p className="text-4xl font-bold">{counts.total}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-sm font-medium mb-2 opacity-90">
                  Unique Subtypes
                </h3>
                <p className="text-4xl font-bold">{counts.chartData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-sm font-medium mb-2 opacity-90">
                  Most Common
                </h3>
                <p className="text-lg font-bold truncate">
                  {counts.chartData[0]?.subtype}
                </p>
                <p className="text-3xl font-bold">
                  {counts.chartData[0]?.count}
                </p>
              </div>
            </div>

            {/* Simple Copy List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Simple List (Copy & Paste)
                </h2>
                <button
                  onClick={handleCopyList}
                  className={`px-4 py-2 text-white text-sm rounded transition-colors flex items-center gap-2 ${
                    copiedList
                      ? "bg-green-600"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {copiedList ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedList ? "Copied!" : "Copy All"}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                {counts.chartData.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-1 hover:bg-gray-100 px-2 rounded"
                  >
                    {item.subtype}: {item.count}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Subtype
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Count
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Percentage
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {counts.chartData.map((item, idx) => (
                      <tr
                        key={item.code}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: colors[idx % colors.length],
                              }}
                            />
                            <span className="font-medium">{item.subtype}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-gray-900">
                          {item.count}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600 font-medium">
                          {((item.count / counts.total) * 100).toFixed(1)}%
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex justify-end">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${
                                    (item.count / counts.total) * 100
                                  }%`,
                                  backgroundColor: colors[idx % colors.length],
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
