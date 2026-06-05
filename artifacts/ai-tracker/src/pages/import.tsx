import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowRight,
  RefreshCw,
  Database,
  Map
} from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { customFetch } from '@workspace/api-client-react';

interface ColumnMapping {
  vendor: string;
  amount: string;
  date: string;
  description: string;
}

export default function ImportPortal() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    vendor: '',
    amount: '',
    date: '',
    description: ''
  });
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }
    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.data.length > 0) {
          setData(results.data);
          const cols = Object.keys(results.data[0]);
          setHeaders(cols);
          
          // Smart Auto-Mapping
          const newMapping = { ...mapping };
          cols.forEach(col => {
            const low = col.toLowerCase();
            if (low.includes('vendor') || low.includes('merchant') || low.includes('platform')) newMapping.vendor = col;
            if (low.includes('amount') || low.includes('price') || low.includes('cost')) newMapping.amount = col;
            if (low.includes('date') || low.includes('time')) newMapping.date = col;
            if (low.includes('desc') || low.includes('memo')) newMapping.description = col;
          });
          setMapping(newMapping);
          setStep('map');
          toast.success(`Parsed ${results.data.length} rows successfully`);
        }
      }
    });
  };

  const handleImport = async () => {
    if (!mapping.vendor || !mapping.amount || !mapping.date) {
      toast.error('Please map Vendor, Amount, and Date columns before importing.');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Importing data to CostPilot Ledger...');

    try {
      const batch = data.map((row) => ({
        platformName: row[mapping.vendor] || 'Unknown',
        amount: parseFloat(row[mapping.amount]) || 0,
        date: row[mapping.date] || new Date().toISOString().slice(0, 10),
        description: mapping.description ? (row[mapping.description] || undefined) : undefined,
      }));

      await customFetch('/api/expenses/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: batch }),
      });

      setIsProcessing(false);
      setStep('complete');
      toast.success('Successfully imported data to CostPilot Ledger', { id: loadingToast });
    } catch (err) {
      setIsProcessing(false);
      toast.error('Failed to import data. Please try again.', { id: loadingToast });
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">CSV Import Portal</h1>
        <p className="text-slate-400 text-sm">
          Onboard your existing AI spend data by uploading your bank or card statement CSV.
        </p>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-12">
        <StepIndicator active={step === 'upload'} complete={step !== 'upload'} label="Upload" />
        <div className="h-px bg-white/10 flex-1" />
        <StepIndicator active={step === 'map'} complete={step === 'preview' || step === 'complete'} label="Map" />
        <div className="h-px bg-white/10 flex-1" />
        <StepIndicator active={step === 'preview'} complete={step === 'complete'} label="Preview" />
      </div>

      {/* Step Content */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 md:p-12 backdrop-blur-md min-h-[400px] flex flex-col justify-center">
        
        {step === 'upload' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-6">
              <Upload size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Select your CSV File</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
              Drag and drop your file here, or click to browse. We support standard exports from Chase, Amex, and Stripe.
            </p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={onFileChange} 
              className="hidden" 
              id="csv-upload" 
            />
            <label 
              htmlFor="csv-upload"
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold cursor-pointer transition-all active:scale-95 inline-flex items-center gap-3 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            >
              <FileSpreadsheet size={20} />
              Choose CSV File
            </label>
          </div>
        )}

        {step === 'map' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-8">
              <Map className="text-indigo-400" size={24} />
              <h2 className="text-xl font-bold text-white">Confirm Data Mapping</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <MapField label="Vendor Name" value={mapping.vendor} options={headers} onChange={(v: string) => setMapping({...mapping, vendor: v})} />
              <MapField label="Transaction Amount" value={mapping.amount} options={headers} onChange={(v: string) => setMapping({...mapping, amount: v})} />
              <MapField label="Transaction Date" value={mapping.date} options={headers} onChange={(v: string) => setMapping({...mapping, date: v})} />
              <MapField label="Description (Optional)" value={mapping.description} options={headers} onChange={(v: string) => setMapping({...mapping, description: v})} />
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setStep('preview')}
                className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
              >
                Review Data <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Database className="text-emerald-400" size={24} />
                <h2 className="text-xl font-bold text-white">Preview Batch ({data.length} rows)</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{file?.name}</span>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-white/5 mb-8">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Vendor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="text-slate-300">
                      <td className="p-4">{row[mapping.vendor]}</td>
                      <td className="p-4 font-mono">${row[mapping.amount]}</td>
                      <td className="p-4">{row[mapping.date]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 5 && (
                <div className="p-4 text-center text-slate-500 font-medium italic border-t border-white/5 bg-white/[0.01]">
                  And {data.length - 5} more rows...
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep('map')} className="text-slate-400 font-bold text-sm hover:text-white transition-colors">Back to Mapping</button>
              <button 
                onClick={handleImport}
                disabled={isProcessing}
                className="px-10 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold flex items-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_rgba(99,102,241,0.3)] disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm & Import to Ledger
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-10 animate-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Import Successful!</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
              We've added {data.length} transactions to your **CostPilot Ledger**. Our Intelligence Engine is now re-calculating your audit results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => window.location.href = '/'} className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-xl">
                Go to Dashboard <ArrowRight size={18} />
              </button>
              <button onClick={() => setStep('upload')} className="w-full sm:w-auto px-8 py-4 bg-white/[0.05] border border-white/10 text-white rounded-2xl font-bold hover:bg-white/[0.1] transition-all">
                Import Another File
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StepIndicator({ active, complete, label }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
        active ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 
        complete ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
        'bg-white/5 text-slate-500 border border-white/10'
      }`}>
        {complete ? <CheckCircle2 size={18} /> : active ? '•' : ''}
      </div>
      <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function MapField({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/[0.08] transition-all"
      >
        <option value="">Select column...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt} className="bg-[#09090b] text-white">{opt}</option>
        ))}
      </select>
    </div>
  );
}
