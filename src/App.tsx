import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { tools } from "./tools";

function App() {
  const [selectedTool, setSelectedTool] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (tools.length > 0 && !selectedTool) {
      setSelectedTool(tools[0].id);
    }
  }, [selectedTool]);

  const currentTool = tools.find((tool) => tool.id === selectedTool);
  const ToolComponent = currentTool?.component;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-gray-900 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-6">Productivity Tools</h1>
          <nav className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`w-full text-left px-4 py-2 rounded transition-colors ${
                  selectedTool === tool.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <div className="font-medium">{tool.name}</div>
                {tool.description && (
                  <div className="text-xs text-gray-400 mt-1">
                    {tool.description}
                  </div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {currentTool?.name}
          </h2>
        </div>

        {/* Tool Content */}
        <div className="flex-1 overflow-auto">
          {ToolComponent && <ToolComponent />}
        </div>
      </div>
    </div>
  );
}

export default App;
