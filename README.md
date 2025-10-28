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

- **JSON to .env Converter**: Convert JSON configuration to environment variable format

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
import React, { useState } from "react";

// Export tool metadata (required)
export const toolConfig = {
  name: "Your Tool Name",
  description: "Brief description of what your tool does",
};

// Export your component as default (required)
export default function YourToolName() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Your Tool Name
        </h1>
        <p className="text-gray-600 mb-6">Tool description</p>

        {/* Your tool UI goes here */}
      </div>
    </div>
  );
}
```

3. That's it! The tool will automatically appear in the sidebar.

### Method 2: Use AI to Generate Tools

Copy this prompt template and use it with Claude or another AI assistant:

---

**📋 AI Tool Generation Prompt Template:**

```
I'm building productivity tools for a React + TypeScript application with auto-discovery.

Please create a tool for: [DESCRIBE YOUR TOOL IDEA]

Requirements:
1. Create a React component in TypeScript
2. Export a toolConfig object with name and description
3. Export the component as default
4. Use Tailwind CSS for styling (utility classes only - no custom CSS)
5. Make it fully functional and self-contained
6. Follow this structure:

import React, { useState } from 'react';

export const toolConfig = {
  name: 'Tool Name',
  description: 'Brief description'
};

export default function ToolName() {
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

- **Must** export `toolConfig` with at least a `name` property
- **Must** have a default export (your React component)
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

## 📄 License

MIT License - feel free to use this for your own projects!
