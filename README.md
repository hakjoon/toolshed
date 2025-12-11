# 🛠️ Toolshed Tools Suite

A local web application for building and organizing your own productivity tools. Features auto-discovery of tools, hot reload during development, and a clean, modern interface.

Mostly a sandbox to play around with vibe coding small tools.

## ✨ Features

- **Auto-Discovery**: Drop a `.tsx` file in `src/tools/` and it automatically appears in the sidebar
- **Hot Reload**: Changes appear instantly while developing
- **TypeScript**: Full type safety and IntelliSense support
- **Modern UI**: Built with React and Tailwind CSS
- **Modular**: Each tool is completely independent
- **Easy to Extend**: Simple structure for adding new tools

## 📦 Included Tools

- **JSON to .env Converter**: Convert JSON configuration to environment variable format with copy-to-clipboard functionality
- **Article Subtype Counter**: Analyze and visualize article subtypes by date range with GROQ query integration, featuring multiple visualization modes (summary cards, tables, bar charts)
- **Workflow State Machine Visualizer**: Complex workflow visualization tool with three view modes (Table, Cards, Mermaid diagrams), filters by user groups and permissions, and interactive state transitions

## 🚀 Quick Start

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd toolshed

# Install dependencies
npm ci

# Start the development server
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in your terminal).

## 📁 Project Structure

```
toolshed/
├── src/
│   ├── tools/                    # All productivity tools go here
│   │   ├── index.ts              # Auto-discovery logic
│   │   └── JsonToEnvConverter.tsx # Example tool
│   ├── App.tsx                   # Main application layout
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles
├── index.html                    # HTML entry point
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── postcss.config.js             # PostCSS configuration
```

## 🔧 Adding New Tools

### Method 1: Manual Creation

1. Create a new file in `src/tools/`, e.g., `src/tools/PasswordGenerator.tsx`

2. Use this template:

```typescript
import { useState } from "react";

function PasswordGenerator() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Password Generator
        </h1>
        <p className="text-gray-600 mb-6">
          Generate secure passwords with customizable options
        </p>

        {/* Your tool UI goes here */}
      </div>
    </div>
  );
}

// Export a single tool object with metadata and component (required)
export const tool = {
  name: "Password Generator",
  description: "Generate secure passwords with customizable options",
  component: PasswordGenerator,
};
```

3. That's it! The tool will automatically appear in the sidebar.

### Key Points

- **Function declaration**: Define your component as a regular function (not `export default`)
- **Single export**: Export a `tool` object containing `name`, `description`, and `component`
- **Auto-discovery**: The tool automatically appears in the sidebar - no registration needed
- **Hot Module Replacement**: Changes appear instantly during development

### Method 2: Use AI to Generate Tools

Copy this prompt template and use it with Claude or another AI assistant:

---

**📋 AI Tool Generation Prompt Template:**

```
I'm building productivity tools for a React + TypeScript application with auto-discovery.

Please create a tool for: [DESCRIBE YOUR TOOL IDEA]

Requirements:
1. Create a React component in TypeScript
2. Export a single 'tool' object containing name, description, and component
3. Use Tailwind CSS for styling (utility classes only - no custom CSS)
4. Make it fully functional and self-contained
5. Follow this structure:

import { useState } from 'react';

function ToolName() {
  // Component logic here

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Tool Name</h1>
        <p className="text-gray-600 mb-6">Description</p>

        {/* Tool UI */}
      </div>
    </div>
  );
}

export const tool = {
  name: 'Tool Name',
  description: 'Brief description',
  component: ToolName,
};

Available Tailwind classes and React hooks can be used.
Icons from lucide-react are available: import { IconName } from 'lucide-react';

Make it visually appealing, intuitive, and fully functional.
```

**Example usage:**

```
I'm building productivity tools for a React + TypeScript application with auto-discovery.

Please create a tool for: A Pomodoro timer with customizable work/break intervals

[Include the requirements from above...]
```

---

### Tool Requirements

- **Must** export a `tool` object with `name`, `description`, and `component` properties
- **Must** define the component as a function (not default export)
- **Should** be self-contained (all logic in one file)
- **Should** use Tailwind CSS utility classes for styling
- **Can** use React hooks (useState, useEffect, etc.)
- **Can** import icons from `lucide-react`

## 🔍 Available Libraries

The following libraries are pre-installed and available for use in your tools:

- **React**: UI framework
- **lucide-react**: Icon library
- **Tailwind CSS**: Utility-first CSS

Additional libraries can be added via `npm install`.

## 🏗️ Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

The production build will be in the `dist/` folder, which can be deployed to any static hosting service.

## 🛠️ Technical Details

### Tool Discovery System

The auto-discovery system uses Vite's `import.meta.glob` to automatically find and register all tools:

```typescript
// src/tools/index.ts
const toolModules = import.meta.glob<{ tool: ToolExport }>("./*.tsx", {
  eager: true,
});

export const tools = Object.keys(toolModules)
  .map((path) => {
    const module = toolModules[path];
    return {
      id: path.replace("./", "").replace(".tsx", ""),
      name: module.tool.name,
      description: module.tool.description,
      component: module.tool.component,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
```

**Key Benefits:**
- ✅ **Zero configuration** - Just drop a file in `src/tools/`
- ✅ **Type-safe** - Full TypeScript support with proper interfaces
- ✅ **HMR support** - Instant hot reload during development
- ✅ **Clean builds** - No warnings, optimized production bundles

### Export Structure

Each tool must export a single `tool` object:

```typescript
export interface ToolExport {
  name: string;              // Display name in sidebar
  description?: string;      // Optional description
  component: React.ComponentType; // Your React component
}
```

This structure:
- Keeps metadata and component together
- Enables immediate sidebar display
- Supports proper HMR without page reloads
- Provides type safety across the application

## 📄 License

MIT License - feel free to use this for your own projects!
