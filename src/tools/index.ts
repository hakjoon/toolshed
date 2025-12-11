export interface ToolExport {
  name: string;
  description?: string;
  component: React.ComponentType;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  component: React.ComponentType;
}

// Single eager import - loads everything upfront for simplicity
// HMR works because Vite can track each module independently
const toolModules = import.meta.glob<{ tool: ToolExport }>("./*.tsx", {
  eager: true,
});

export const tools: Tool[] = Object.keys(toolModules)
  .filter((path) => !path.includes("index.tsx"))
  .map((path) => {
    const id = path.replace("./", "").replace(".tsx", "");
    const module = toolModules[path];

    return {
      id,
      name: module.tool.name,
      description: module.tool.description,
      component: module.tool.component,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}
