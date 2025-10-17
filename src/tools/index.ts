export interface ToolConfig {
  name: string;
  description?: string;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  component: React.ComponentType;
}

// Auto-discover all tool files
const toolModules = import.meta.glob("./*.tsx", { eager: true });

export const tools: Tool[] = Object.entries(toolModules)
  .filter(([path]) => !path.includes("index.tsx"))
  .map(([path, module]: [string, any]) => {
    const id = path.replace("./", "").replace(".tsx", "");
    const config: ToolConfig = module.toolConfig || { name: id };

    return {
      id,
      name: config.name,
      description: config.description,
      component: module.default,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
