import React, { useState } from 'react';
import { 
  FilePlus2, 
  Layout, 
  BarChart3, 
  PieChart, 
  MousePointer2, 
  Share2, 
  Download, 
  Settings2,
  Plus,
  GripVertical,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportBuilder() {
  const [widgets, setWidgets] = useState([
    { id: 1, title: 'Monthly Spend Velocity', type: 'line', size: 'large' },
    { id: 2, title: 'Vendor Distribution', type: 'pie', size: 'small' },
    { id: 3, title: 'ROI by Cost Center', type: 'bar', size: 'small' },
  ]);

  const addWidget = () => {
    const newWidget = { id: Date.now(), title: 'New Analysis Widget', type: 'bar', size: 'small' };
    setWidgets([...widgets, newWidget]);
    toast.success('Widget added to your custom report');
  };

  const removeWidget = (id: number) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Custom Report Builder</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Drag-and-drop to create specialized financial dashboards. Share dynamic links with stakeholders or export as executive-ready decks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2">
            <Share2 size={16} />
            Share Report
          </button>
          <button className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg">
            <Download size={16} />
            Export Deck
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Toolbox Sidebar */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Chart Library</h3>
            <div className="space-y-3">
              <ToolboxItem icon={<BarChart3 size={16} />} label="Bar Chart" />
              <ToolboxItem icon={<PieChart size={16} />} label="Pie Allocation" />
              <ToolboxItem icon={<Layout size={16} />} label="Metric Card" />
              <ToolboxItem icon={<MousePointer2 size={16} />} label="Data Table" />
            </div>
            <button 
              onClick={addWidget}
              className="w-full mt-8 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Custom Widget
            </button>
          </div>
          
          <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl">
            <h4 className="text-xs font-bold text-white mb-2">Dynamic Filters</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
              Apply global filters to this report to isolate spend by region, department, or legal entity.
            </p>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Configure Filters</button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {widgets.map((widget) => (
              <div 
                key={widget.id} 
                className={`bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md relative group ${
                  widget.size === 'large' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-slate-700 cursor-grab active:cursor-grabbing" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">{widget.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white"><Settings2 size={14} /></button>
                    <button 
                      onClick={() => removeWidget(widget.id)}
                      className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Mock Chart Area */}
                <div className="h-48 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-slate-700 italic text-xs">
                  {widget.type.toUpperCase()} Visualisation Area
                </div>
              </div>
            ))}
            
            {/* Empty State / Add Area */}
            <button 
              onClick={addWidget}
              className="md:col-span-2 py-20 border-2 border-dashed border-white/5 rounded-[2rem] hover:border-indigo-500/30 hover:bg-white/[0.01] transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                <FilePlus2 size={24} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Drop a widget here to expand your analysis</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolboxItem({ icon, label }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-indigo-500/5 cursor-grab active:cursor-grabbing transition-all group">
      <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">{icon}</div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white">{label}</span>
    </div>
  );
}
