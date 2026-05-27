import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Local file upload for question images.
 *
 * - Admin-only.
 * - multipart/form-data with a single `image` field.
 * - Saves to `public/uploads/questions/<id>.<ext>` and returns a root-relative URL
 *   the browser can load directly (no signed URLs, no CDN).
 *
 * In production we'd swap the body of this handler for an S3/R2 `PutObject` —
 * the contract (return `{ url }`) stays the same.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'image' file field" }, { status: 400 });
  }

  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}. Use PNG, JPEG, WebP, or GIF.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${formatBytes(file.size)}). Max is 5 MB.` },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  const id = "img_" + randomBytes(12).toString("hex");
  const filename = `${id}.${ext}`;

  const uploadsDir = join(process.cwd(), "public", "uploads", "questions");
  await mkdir(uploadsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadsDir, filename), buffer);

  return NextResponse.json({
    ok: true,
    url: `/uploads/questions/${filename}`,
    sizeBytes: file.size,
    mimeType: file.type,
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
