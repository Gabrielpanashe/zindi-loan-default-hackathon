import { useEffect, useState } from "react";
import { api, getToken } from "../api";

type Job = {
  id: number;
  status: string;
  input_filename: string;
  summary: Record<string, unknown> | null;
  error_message: string | null;
};

export default function Batch() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api<Job[]>("/batches").then(setJobs).catch((e) => setError(e.message));

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
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_${id}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Batch loan scoring</h2>
      <div className="card">
        <p style={{ color: "var(--muted)" }}>
          Upload a CSV with the same columns as the training dataset (Zindi schema). Results include PD and
          recommendations per row.
        </p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {error && <p className="error">{error}</p>}
        <button type="button" disabled={!file || loading} onClick={upload}>
          {loading ? "Uploading…" : "Upload & score"}
        </button>
      </div>
      <div className="card">
        <h2>Jobs</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th>ID</th>
              <th>File</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td>
                <td>{j.input_filename}</td>
                <td>{j.status}</td>
                <td>
                  {j.status === "completed" && (
                    <button type="button" className="secondary" onClick={() => download(j.id)}>
                      Download
                    </button>
                  )}
                  {j.status === "failed" && <span className="error">{j.error_message}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
