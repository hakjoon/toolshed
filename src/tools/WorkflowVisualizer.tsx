import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { ChevronDown, Info, Copy, Check, Upload } from 'lucide-react';

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-in;
  }
`;
if (!document.head.contains(style)) {
  document.head.appendChild(style);
}

interface WorkflowState {
  slug: string;
  name: string;
  uuid: string;
  editable_groups?: string[][];
  viewable_groups?: string[][];
  flag?: number;
}

interface WorkflowEvent {
  slug: string;
  name: string;
  uuid: string;
  destination?: [string, string];
  source?: [string, string][];
  groups?: string[][];
  event_group?: string;
  confirmation?: boolean;
  validator?: string[];
  on_before?: string;
  on_after?: string;
  filters_to_run?: any[];
}

interface Workflow {
  slug: string;
  name: string;
  uuid: string;
  default_state?: [string, string];
  events?: [string, string][];
}

interface WorkflowDataItem {
  model: string;
  fields: WorkflowState | WorkflowEvent | Workflow;
}

function WorkflowVisualizer() {
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showLegend, setShowLegend] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'mermaid'>('table');
  const [workflowData, setWorkflowData] = useState<{
    states: Record<string, WorkflowState>;
    events: Record<string, WorkflowEvent>;
    workflows: Record<string, Workflow>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [excludedStates, setExcludedStates] = useState(new Set<string>());
  const [showStateFilter, setShowStateFilter] = useState(false);
  const [hideViewOnlyStates, setHideViewOnlyStates] = useState(false);
  const [expandedStateCards, setExpandedStateCards] = useState(new Set<string>());
  const [expandedEventCards, setExpandedEventCards] = useState(new Set<string>());
  const [expandedTableRows, setExpandedTableRows] = useState(new Set<number>());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Mermaid library
  useEffect(() => {
    interface WindowWithMermaid extends Window {
      mermaid?: {
        initialize: (config: unknown) => void;
        render: (id: string, code: string) => Promise<{ svg: string }>;
      };
    }

    const win = window as WindowWithMermaid;

    if (typeof window !== 'undefined' && !win.mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        win.mermaid?.initialize({
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          }
        });
        setMermaidLoaded(true);
      };
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    } else if (win.mermaid) {
      setMermaidLoaded(true);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data: WorkflowDataItem[] = JSON.parse(e.target?.result as string);
        
        const states: Record<string, WorkflowState> = {};
        const events: Record<string, WorkflowEvent> = {};
        const workflows: Record<string, Workflow> = {};
        
        data.forEach(item => {
          if (item.model === 'workflow.state') {
            states[item.fields.uuid] = item.fields;
          } else if (item.model === 'workflow.event') {
            events[item.fields.uuid] = item.fields;
          } else if (item.model === 'workflow.workflow') {
            workflows[item.fields.slug] = item.fields;
          }
        });
        
        setWorkflowData({ states, events, workflows });
        
        // Set first workflow as selected
        const firstWorkflow = Object.keys(workflows)[0];
        if (firstWorkflow) {
          setSelectedWorkflow(firstWorkflow);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error parsing workflow data:', error);
        alert('Error parsing JSON file. Please check the file format.');
        setLoading(false);
      }
    };
    
    reader.readAsText(file);
  };

  const allGroups = useMemo(() => {
    if (!workflowData) return ['all'];
    
    const groups = new Set<string>();
    Object.values(workflowData.states).forEach(state => {
      state.editable_groups?.forEach(g => groups.add(g[0]));
      state.viewable_groups?.forEach(g => groups.add(g[0]));
    });
    Object.values(workflowData.events).forEach(event => {
      event.groups?.forEach(g => groups.add(g[0]));
    });
    return ['all', ...Array.from(groups).sort()];
  }, [workflowData]);

  const filteredFlow = useMemo(() => {
    if (!workflowData) return { states: [], events: [], stateMap: {} };
    
    const workflow = workflowData.workflows[selectedWorkflow];
    if (!workflow) return { states: [], events: [], stateMap: {} };

    const relevantStateUuids = new Set<string>();
    const relevantEvents: WorkflowEvent[] = [];

    workflow.events?.forEach(([, eventUuid]) => {
      const event = workflowData.events[eventUuid];
      if (!event) return;

      const isAccessible = selectedGroup === 'all' ||
        event.groups?.some(g => g[0] === selectedGroup);

      if (isAccessible) {
        relevantEvents.push(event);
        event.source?.forEach(([, uuid]) => relevantStateUuids.add(uuid));
        if (event.destination) {
          relevantStateUuids.add(event.destination[1]);
        }
      }
    });

    const stateMap: Record<string, WorkflowState> = {};
    const relevantStates = Array.from(relevantStateUuids)
      .map(uuid => workflowData.states[uuid])
      .filter(state => {
        if (!state) return false;
        
        stateMap[state.uuid] = state;
        
        if (selectedGroup === 'all') return true;
        
        const canEdit = state.editable_groups?.some(g => g[0] === selectedGroup);
        const canView = state.viewable_groups?.some(g => g[0] === selectedGroup);
        return canEdit || canView;
      });

    return { states: relevantStates, events: relevantEvents, stateMap };
  }, [selectedWorkflow, selectedGroup, workflowData]);

  const getStatePermission = (state: WorkflowState) => {
    if (selectedGroup === 'all') return 'all';
    
    const canEdit = state.editable_groups?.some(g => g[0] === selectedGroup);
    if (canEdit) return 'edit';
    
    const canView = state.viewable_groups?.some(g => g[0] === selectedGroup);
    if (canView) return 'view';
    
    return 'none';
  };

  const mermaidCode = useMemo(() => {
    if (!filteredFlow.states.length) return '';
    
    const visibleStates = filteredFlow.states.filter(state => {
      if (excludedStates.has(state.uuid)) return false;
      if (hideViewOnlyStates && selectedGroup !== 'all') {
        const permission = getStatePermission(state);
        return permission === 'edit';
      }
      return true;
    });
    
    const visibleStateUuids = new Set(visibleStates.map(s => s.uuid));
    
    let code = 'graph LR\n';
    
    visibleStates.forEach(state => {
      const permission = getStatePermission(state);
      const stateId = state.slug.replace(/-/g, '_');
      const className = permission === 'edit' ? 'editState' : 
                       permission === 'view' ? 'viewState' : 'allState';
      code += `    ${stateId}["${state.name}"]:::${className}\n`;
    });
    
    code += '\n';
    
    filteredFlow.events.forEach(event => {
      event.source?.forEach(([, sourceUuid]) => {
        const destUuid = event.destination?.[1];
        if (!destUuid) return;

        if (!visibleStateUuids.has(sourceUuid) || !visibleStateUuids.has(destUuid)) return;

        const sourceState = filteredFlow.stateMap[sourceUuid];
        const destState = filteredFlow.stateMap[destUuid];

        if (sourceState && destState) {
          const sourceId = sourceState.slug.replace(/-/g, '_');
          const destId = destState.slug.replace(/-/g, '_');
          const label = event.name.replace(/"/g, "'");
          code += `    ${sourceId} -->|"${label}"| ${destId}\n`;
        }
      });
    });
    
    code += '\n    classDef editState fill:#d1fae5,stroke:#10b981,stroke-width:3px\n';
    code += '    classDef viewState fill:#dbeafe,stroke:#3b82f6,stroke-width:3px\n';
    code += '    classDef allState fill:#ede9fe,stroke:#8b5cf6,stroke-width:3px\n';
    
    return code;
  }, [filteredFlow, selectedGroup, excludedStates, hideViewOnlyStates]);

  interface TransitionMatrixItem {
    source: WorkflowState;
    dest: WorkflowState;
    events: WorkflowEvent[];
  }

  const transitionMatrix = useMemo(() => {
    const matrix: Record<string, TransitionMatrixItem> = {};
    
    filteredFlow.events.forEach(event => {
      event.source?.forEach(([, sourceUuid]) => {
        const destUuid = event.destination?.[1];
        if (!destUuid) return;

        const sourceState = filteredFlow.stateMap[sourceUuid];
        const destState = filteredFlow.stateMap[destUuid];

        if (sourceState && destState) {
          const key = `${sourceState.uuid}-${destState.uuid}`;
          if (!matrix[key]) {
            matrix[key] = {
              source: sourceState,
              dest: destState,
              events: []
            };
          }
          matrix[key].events.push(event);
        }
      });
    });
    
    return Object.values(matrix);
  }, [filteredFlow]);

  const copyMermaidCode = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStateExclusion = (stateUuid: string) => {
    setExcludedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateUuid)) {
        newSet.delete(stateUuid);
      } else {
        newSet.add(stateUuid);
      }
      return newSet;
    });
  };

  const clearExcludedStates = () => {
    setExcludedStates(new Set());
  };

  const visibleStateCount = useMemo(() => {
    return filteredFlow.states.filter(state => {
      if (excludedStates.has(state.uuid)) return false;
      if (hideViewOnlyStates && selectedGroup !== 'all') {
        const permission = getStatePermission(state);
        return permission === 'edit';
      }
      return true;
    }).length;
  }, [filteredFlow.states, excludedStates, hideViewOnlyStates, selectedGroup]);

  const toggleTableRow = (rowKey: number) => {
    setExpandedTableRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  const expandAllTableRows = () => {
    setExpandedTableRows(new Set(transitionMatrix.map((_, idx) => idx)));
  };

  const collapseAllTableRows = () => {
    setExpandedTableRows(new Set());
  };

  const toggleStateCard = (stateUuid: string) => {
    setExpandedStateCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateUuid)) {
        newSet.delete(stateUuid);
      } else {
        newSet.add(stateUuid);
      }
      return newSet;
    });
  };

  const toggleEventCard = (eventUuid: string) => {
    setExpandedEventCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventUuid)) {
        newSet.delete(eventUuid);
      } else {
        newSet.add(eventUuid);
      }
      return newSet;
    });
  };

  const expandAllStateCards = () => {
    setExpandedStateCards(new Set(filteredFlow.states.map(s => s.uuid)));
  };

  const collapseAllStateCards = () => {
    setExpandedStateCards(new Set());
  };

  const expandAllEventCards = () => {
    setExpandedEventCards(new Set(filteredFlow.events.map(e => e.uuid)));
  };

  const collapseAllEventCards = () => {
    setExpandedEventCards(new Set());
  };

  useEffect(() => {
    interface WindowWithMermaid extends Window {
      mermaid?: {
        render: (id: string, code: string) => Promise<{ svg: string }>;
      };
    }

    if (mermaidLoaded && mermaidRef.current && mermaidCode && viewMode === 'mermaid') {
      mermaidRef.current.innerHTML = '';

      const renderDiagram = async () => {
        try {
          const win = window as WindowWithMermaid;
          const result = await win.mermaid?.render('mermaid-diagram', mermaidCode);
          if (mermaidRef.current && result) {
            mermaidRef.current.innerHTML = result.svg;
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '<div class="text-red-600 p-4">Error rendering diagram.</div>';
          }
        }
      };

      renderDiagram();
    }
  }, [mermaidLoaded, mermaidCode, viewMode]);

  if (!workflowData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Workflow State Machine Visualizer</h1>
          <p className="text-gray-600 mb-6">
            Upload your workflow JSON data to visualize and explore state machines with permissions and transitions
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload Workflow Data</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a JSON file containing workflow states, events, and transitions
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Choose File
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading workflow data...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflow State Machine Visualizer</h1>
        <p className="text-gray-600 mt-2">
          Explore workflow states and transitions by user group
        </p>
      </div>
      
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workflow
            </label>
            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(workflowData.workflows).map(([slug, workflow]) => (
                <option key={slug} value={slug}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Group
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allGroups.map(group => (
                <option key={group} value={group}>
                  {group === 'all' ? 'All Groups' : group}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Transition Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                viewMode === 'cards'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('mermaid')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                viewMode === 'mermaid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Diagram
            </button>
          </div>
        </div>
        
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center"
        >
          <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showLegend ? 'rotate-180' : ''}`} />
          {showLegend ? 'Hide' : 'Show'} Legend
        </button>
        
        {showLegend && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Permission Levels</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span><strong>Green:</strong> User can edit content in this state</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span><strong>Blue:</strong> User can only view content in this state</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                <span><strong>Purple:</strong> All groups view</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 flex-1">
            <p className="font-medium mb-1">
              {selectedGroup === 'all' ? 'Showing all states and actions' : `Showing ${selectedGroup}'s view`}
            </p>
            <p>
              {visibleStateCount} of {filteredFlow.states.length} state{filteredFlow.states.length !== 1 ? 's' : ''} visible • {filteredFlow.events.length} action{filteredFlow.events.length !== 1 ? 's' : ''} available
              {(excludedStates.size > 0 || hideViewOnlyStates) && (
                <button
                  onClick={() => {
                    clearExcludedStates();
                    setHideViewOnlyStates(false);
                  }}
                  className="ml-2 text-blue-700 underline hover:text-blue-900"
                >
                  Reset filters
                </button>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">State Transitions</h2>
              <div className="flex gap-2">
                <button
                  onClick={expandAllTableRows}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Expand All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={collapseAllTableRows}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Collapse All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-8 px-3 py-3"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To State
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transitionMatrix.map((transition: TransitionMatrixItem, idx: number) => {
                    const sourcePerm = getStatePermission(transition.source);
                    const destPerm = getStatePermission(transition.dest);
                    const isExpanded = expandedTableRows.has(idx);
                    
                    return (
                      <Fragment key={idx}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-4">
                            <button
                              onClick={() => toggleTableRow(idx)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <ChevronDown 
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ 
                                  backgroundColor: sourcePerm === 'edit' ? '#10b981' : 
                                                  sourcePerm === 'view' ? '#3b82f6' : '#8b5cf6'
                                }}
                              ></div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {transition.source.name}
                                </div>
                                {sourcePerm !== 'all' && (
                                  <div className="text-xs text-gray-500">{sourcePerm}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {transition.events.map((event: WorkflowEvent, eidx: number) => (
                                <div key={eidx} className="flex items-center">
                                  <span className="text-sm text-gray-900">{event.name}</span>
                                  {event.event_group !== 'main' && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                      event.event_group === 'publish' ? 'bg-green-100 text-green-800' :
                                      event.event_group === 'preview' ? 'bg-blue-100 text-blue-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      {event.event_group}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ 
                                  backgroundColor: destPerm === 'edit' ? '#10b981' : 
                                                  destPerm === 'view' ? '#3b82f6' : '#8b5cf6'
                                }}
                              ></div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {transition.dest.name}
                                </div>
                                {destPerm !== 'all' && (
                                  <div className="text-xs text-gray-500">{destPerm}</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 animate-fadeIn">
                            <td></td>
                            <td colSpan={3} className="px-6 py-4">
                              <div className="space-y-4 text-sm">
                                <div>
                                  <p className="font-semibold text-gray-700 mb-2">
                                    From: {transition.source.name}
                                  </p>
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-600 mb-1">Slug:</p>
                                    <code className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-mono">
                                      {transition.source.slug}
                                    </code>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {transition.source.editable_groups && transition.source.editable_groups.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-600 mb-1">Can Edit:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {transition.source.editable_groups?.map((g: string[], i: number) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                              {g[0]}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {transition.source.viewable_groups && transition.source.viewable_groups.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-600 mb-1">Can View:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {transition.source.viewable_groups?.map((g: string[], i: number) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                              {g[0]}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-semibold text-gray-700 mb-2">Actions:</p>
                                  {transition.events.map((event: WorkflowEvent, i: number) => (
                                    <div key={i} className="bg-white p-3 rounded border mb-2">
                                      <div className="font-medium mb-1">{event.name}</div>
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-600 mb-1">Slug:</p>
                                        <code className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-mono">
                                          {event.slug}
                                        </code>
                                      </div>
                                      {event.groups && (
                                        <div className="mb-2">
                                          <p className="text-xs text-gray-600 mb-1">Available to:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {event.groups.map((g: string[], j: number) => (
                                              <span key={j} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                {g[0]}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        {event.validator?.map((v: string, j: number) => (
                                          <span key={j} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                                            {v}
                                          </span>
                                        ))}
                                        {event.on_before && event.on_before !== 'none' && (
                                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded">
                                            Before: {event.on_before}
                                          </span>
                                        )}
                                        {event.on_after && event.on_after !== 'none' && (
                                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded">
                                            After: {event.on_after}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div>
                                  <p className="font-semibold text-gray-700 mb-2">
                                    To: {transition.dest.name}
                                  </p>
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-600 mb-1">Slug:</p>
                                    <code className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-mono">
                                      {transition.dest.slug}
                                    </code>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {transition.dest.editable_groups && transition.dest.editable_groups.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-600 mb-1">Can Edit:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {transition.dest.editable_groups?.map((g: string[], i: number) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                              {g[0]}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {transition.dest.viewable_groups && transition.dest.viewable_groups.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-600 mb-1">Can View:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {transition.dest.viewable_groups?.map((g: string[], i: number) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                              {g[0]}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'mermaid' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <button
              onClick={() => setShowStateFilter(!showStateFilter)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Filter States ({visibleStateCount} visible)
              </h3>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showStateFilter ? 'rotate-180' : ''}`} />
            </button>
            
            {showStateFilter && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {selectedGroup !== 'all' && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideViewOnlyStates}
                        onChange={(e) => setHideViewOnlyStates(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Show only editable states
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Click states to hide/show
                  </p>
                  {(excludedStates.size > 0 || hideViewOnlyStates) && (
                    <button
                      onClick={() => {
                        clearExcludedStates();
                        setHideViewOnlyStates(false);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredFlow.states.map(state => {
                    const isManuallyExcluded = excludedStates.has(state.uuid);
                    const permission = getStatePermission(state);
                    const isAutoHidden = hideViewOnlyStates && selectedGroup !== 'all' && permission === 'view';
                    const isExcluded = isManuallyExcluded || isAutoHidden;
                    const color = permission === 'edit' ? '#10b981' : 
                                 permission === 'view' ? '#3b82f6' : '#8b5cf6';
                    
                    return (
                      <button
                        key={state.uuid}
                        onClick={() => !isAutoHidden && toggleStateExclusion(state.uuid)}
                        disabled={isAutoHidden}
                        className={`p-2 rounded-lg border-2 text-left text-sm transition-all ${
                          isExcluded 
                            ? 'bg-gray-100 border-gray-300 opacity-50' 
                            : 'bg-white hover:shadow-md'
                        } ${isAutoHidden ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        style={{ 
                          borderColor: isExcluded ? '#d1d5db' : color
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isExcluded ? '#9ca3af' : color }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <span className={`block truncate ${isExcluded ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {state.name}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Flow Diagram</h2>
              <button
                onClick={copyMermaidCode}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto">
              {!mermaidLoaded ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading diagram...</span>
                </div>
              ) : visibleStateCount === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <p>No states visible. Adjust filters above.</p>
                </div>
              ) : (
                <div ref={mermaidRef} className="flex justify-center items-center min-h-[400px]"></div>
              )}
            </div>

            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Show Mermaid Code
              </summary>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{mermaidCode}</code>
              </pre>
            </details>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">States</h2>
              <div className="flex gap-2">
                <button onClick={expandAllStateCards} className="text-sm text-blue-600 hover:text-blue-700">
                  Expand All
                </button>
                <span className="text-gray-400">|</span>
                <button onClick={collapseAllStateCards} className="text-sm text-blue-600 hover:text-blue-700">
                  Collapse All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlow.states.map(state => {
                const permission = getStatePermission(state);
                const color = permission === 'edit' ? '#10b981' : 
                             permission === 'view' ? '#3b82f6' : '#8b5cf6';
                const isExpanded = expandedStateCards.has(state.uuid);
                
                return (
                  <div
                    key={state.uuid}
                    className="p-4 rounded-lg border-2 bg-gray-50 transition-all hover:shadow-md"
                    style={{ borderColor: color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{state.name}</h3>
                        
                        {selectedGroup !== 'all' && (
                          <span 
                            className="inline-block mt-2 text-xs px-2 py-1 rounded font-medium text-white"
                            style={{ backgroundColor: color }}
                          >
                            {permission}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleStateCard(state.uuid)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <ChevronDown 
                          className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 animate-fadeIn">
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Slug:</p>
                          <code className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono">
                            {state.slug}
                          </code>
                        </div>
                        
                        {state.editable_groups && state.editable_groups.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Can Edit:</p>
                            <div className="flex flex-wrap gap-1">
                              {state.editable_groups.map((group, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded"
                                >
                                  {group[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {state.viewable_groups && state.viewable_groups.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Can View:</p>
                            <div className="flex flex-wrap gap-1">
                              {state.viewable_groups.map((group, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                                >
                                  {group[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Available Actions</h2>
              <div className="flex gap-2">
                <button onClick={expandAllEventCards} className="text-sm text-blue-600 hover:text-blue-700">
                  Expand All
                </button>
                <span className="text-gray-400">|</span>
                <button onClick={collapseAllEventCards} className="text-sm text-blue-600 hover:text-blue-700">
                  Collapse All
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {filteredFlow.events.map(event => {
                const sourceStates = event.source?.map(([slug, uuid]) => 
                  filteredFlow.stateMap[uuid]?.name || slug
                ) || [];
                
                const destState = filteredFlow.stateMap[event.destination?.[1] || ''];
                const isExpanded = expandedEventCards.has(event.uuid);
                
                return (
                  <div key={event.uuid} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.event_group === 'publish' ? 'bg-green-100 text-green-800' :
                          event.event_group === 'preview' ? 'bg-blue-100 text-blue-800' :
                          event.event_group === 'seo' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.event_group}
                        </span>
                        <button
                          onClick={() => toggleEventCard(event.uuid)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">From:</span>
                        <div className="mt-1 space-y-1">
                          {sourceStates.map((stateName, idx) => (
                            <div key={idx} className="text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs">
                              {stateName}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">To:</span>
                        <div className="mt-1">
                          <div className="text-gray-700 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                            {destState?.name || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 animate-fadeIn">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Slug:</p>
                          <code className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono">
                            {event.slug}
                          </code>
                        </div>

                        {event.groups && event.groups.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Available to Groups:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.groups.map((group, idx) => (
                                <span 
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded ${
                                    selectedGroup !== 'all' && group[0] === selectedGroup
                                      ? 'bg-purple-100 text-purple-800 font-semibold'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {group[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {event.validator && event.validator.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Validators:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.validator.map((val, vidx) => (
                                <span 
                                  key={vidx}
                                  className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-mono"
                                >
                                  {val}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {event.on_before && event.on_before !== 'none' && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">On Before:</p>
                            <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-800 rounded font-mono">
                              {event.on_before}
                            </span>
                          </div>
                        )}

                        {event.on_after && event.on_after !== 'none' && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">On After:</p>
                            <span className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded font-mono">
                              {event.on_after}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs">
                          {event.confirmation && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                              Requires Confirmation
                            </span>
                          )}
                          {event.filters_to_run && event.filters_to_run.length > 0 && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                              Runs Filters ({event.filters_to_run.length})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const tool = {
  name: 'Workflow State Machine Visualizer',
  description: 'Visualize and explore workflow state machines with permissions, transitions, and user groups',
  component: WorkflowVisualizer,
};