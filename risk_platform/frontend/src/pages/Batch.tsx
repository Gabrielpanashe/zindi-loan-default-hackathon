import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Download, CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { api, getToken } from "../api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type Job = {
  id: number;
  status: string;
  input_filename: string;
  summary: {
    rows?: number;
    avg_probability_default?: number;
    risk_tier_counts?: Record<string, number>;
    recommendation_counts?: Record<string, number>;
  } | null;
  error_message: string | null;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending:   { icon: Clock,         color: "text-[#8b9cb3]", label: "Pending" },
  running:   { icon: Clock,         color: "text-amber-400", label: "Processing" },
  completed: { icon: CheckCircle,   color: "text-emerald-400", label: "Completed" },
  failed:    { icon: AlertCircle,   color: "text-red-400", label: "Failed" },
};

export default function Batch() {
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [file, setFile]     = useState<File | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => api<Job[]>("/batches").then(setJobs).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const token = getToken();
      const res = await fetch("/api/v1/batches", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
      setFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const download = async (id: number) => {
    const token = getToken();
    const res = await fetch(`/api/v1/batches/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_${id}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) setFile(f);
    else setError("Please drop a CSV file.");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1">Batch Loan Scoring</h1>
        <p className="text-[#8b9cb3] text-sm">Upload a CSV of loan applications. Results are scored asynchronously and available for download.</p>
      </div>

      {/* Upload zone */}
      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-[#3b82f6] bg-[#3b82f6]/5" :
            file ? "border-emerald-600/50 bg-emerald-900/10" :
            "border-[#243044] hover:border-[#3b82f6]/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText size={32} className="text-emerald-400" />
              <div className="font-semibold text-[#e8eef4]">{file.name}</div>
              <div className="text-xs text-[#8b9cb3]">{(file.size / 1024).toFixed(1)} KB · ready to upload</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} className="text-[#8b9cb3]" />
              <div className="text-[#e8eef4] font-medium">Drop CSV file here or click to browse</div>
              <div className="text-xs text-[#8b9cb3]">Same column schema as Zindi training data</div>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button onClick={upload} disabled={!file || loading} size="lg" className="shadow-lg shadow-blue-500/20">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload & Score</>}
          </Button>
          {file && <Button variant="ghost" onClick={() => setFile(null)} size="lg">Clear</Button>}
        </div>
      </div>

      {/* Jobs list */}
      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <h3 className="font-semibold text-[#e8eef4] text-sm mb-4">Scoring Jobs</h3>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-[#8b9cb3] text-sm">No jobs yet. Upload a CSV to get started.</div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => {
              const cfg = STATUS_CONFIG[j.status] || STATUS_CONFIG.pending;
              return (
                <motion.div key={j.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border border-[#243044] rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <cfg.icon size={18} className={`${cfg.color} shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#e8eef4] truncate">{j.input_filename}</div>
                      <div className="text-xs text-[#8b9cb3] mt-0.5">
                        Job #{j.id} · {new Date(j.created_at).toLocaleString()}
                      </div>
                      {j.summary && (
                        <div className="flex gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-[#8b9cb3]">{j.summary.rows} rows</span>
                          <span className="text-xs text-emerald-400">{j.summary.recommendation_counts?.approve ?? 0} approve</span>
                          <span className="text-xs text-amber-400">{j.summary.recommendation_counts?.manual_review ?? 0} review</span>
                          <span className="text-xs text-red-400">{j.summary.recommendation_counts?.reject ?? 0} reject</span>
                        </div>
                      )}
                      {j.error_message && <p className="text-xs text-red-400 mt-1">{j.error_message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={j.status === "completed" ? "approve" : j.status === "failed" ? "reject" : "default"}>
                      {cfg.label}
                    </Badge>
                    {j.status === "completed" && (
                      <Button variant="secondary" size="sm" onClick={() => download(j.id)}>
                        <Download size={13} /> Download
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
