import React from 'react';
import { 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { Link } from 'wouter';

interface Source {
  id: number;
  name: string;
  type: string;
  status: string;
  lastSync: string;
}

interface ConnectedSourcesCardProps {
  sources: Source[];
}

export const ConnectedSourcesCard: React.FC<ConnectedSourcesCardProps> = ({ sources }) => {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Connected Sources</h3>
        <Link href="/integrations" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">+ Connect</Link>
      </div>
      
      <div className="space-y-3">
        {sources.map(source => (
          <div key={source.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                <LinkIcon size={14} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{source.name}</div>
                <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{source.type}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                source.status === 'Connected' ? 'text-emerald-400' : 
                source.status === 'Syncing' ? 'text-indigo-400' : 
                'text-red-400'
              }`}>
                {source.status}
              </span>
              {source.status === 'Connected' ? <CheckCircle2 size={12} className="text-emerald-500" /> : 
               source.status === 'Syncing' ? <RefreshCw size={12} className="text-indigo-500 animate-spin" /> : 
               <AlertCircle size={12} className="text-red-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
