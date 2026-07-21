import { useRef, useState } from "react";
import jsQR from "jsqr";
import { QrCode, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface QrScanResult {
  payload: string;
  fileName: string;
}

export function QrScanner({
  results,
  onAdd,
  onRemove,
}: {
  results: QrScanResult[];
  onAdd: (r: QrScanResult) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  async function decodeFile(file: File): Promise<string | null> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const canvas = document.createElement("canvas");
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      return code?.data ?? null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setScanning(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        try {
          const payload = await decodeFile(file);
          if (!payload) {
            toast.error(`No QR code found in ${file.name}`);
            continue;
          }
          onAdd({ payload, fileName: file.name });
          toast.success(`QR decoded: ${payload.slice(0, 40)}${payload.length > 40 ? "…" : ""}`);
        } catch (e) {
          console.error(e);
          toast.error(`Failed to scan ${file.name}`);
        }
      }
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50 transition"
        >
          {scanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <QrCode className="h-3.5 w-3.5 text-primary" />
          )}
          {scanning ? "Scanning…" : "Attach QR code image"}
        </button>
        <span className="text-xs text-muted-foreground">
          Upload a QR screenshot to check its payload for scams.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {results.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/40 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            QR payloads attached
          </div>
          {results.map((r, i) => (
            <div
              key={`${r.fileName}-${i}`}
              className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border px-3 py-2"
            >
              <QrCode className="h-3.5 w-3.5 mt-1 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted-foreground truncate">{r.fileName}</div>
                <div className="text-xs font-mono truncate">{r.payload}</div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove QR payload"
                className="text-muted-foreground hover:text-danger transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
