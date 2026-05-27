"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Current image URL. Pass `""` or `null` when there is no image. */
  value: string | null;
  /** Called with the new root-relative URL after a successful upload, or `null` when removed. */
  onChange: (url: string | null) => void;
  className?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Drag-and-drop image upload with click-to-browse fallback. POSTs to
 * `/api/admin/upload-image` and renders a preview of the result.
 *
 * The `value` is always a root-relative URL — this component never holds the
 * original File object after upload completes.
 */
export function ImageUploader({ value, onChange, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED.includes(file.type)) {
        setError(`Unsupported file type. Use PNG, JPEG, WebP, or GIF.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${formatBytes(file.size)}). Max is 5 MB.`,
        );
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          setError(data?.error ?? "Upload failed");
          return;
        }
        onChange(data.url);
      } catch (err) {
        setError((err as Error).message || "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange],
  );

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  function remove() {
    setError(null);
    onChange(null);
  }

  // ---------- With existing image: preview + remove ----------
  if (value) {
    return (
      <div className={cn("space-y-2", className)}>
        <figure className="relative inline-block overflow-hidden rounded-md border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Question image"
            className="block max-h-[200px] w-auto object-contain"
          />
        </figure>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={remove}
            className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
          >
            ✕ Remove
          </button>
          <span className="truncate text-muted-foreground">{value}</span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // ---------- Empty: drop zone + file input fallback ----------
  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-8 text-center text-sm transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:bg-muted/40",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {uploading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <span className="font-medium">Drop an image here or click to browse</span>
            <span className="text-xs text-muted-foreground">
              PNG, JPEG, WebP, or GIF · up to 5 MB
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPick}
        className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:font-medium file:text-secondary-foreground hover:file:bg-accent"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
