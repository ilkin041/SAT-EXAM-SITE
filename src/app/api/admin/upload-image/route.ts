import { NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { auth } from "@/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Image upload for question content. Streams the file straight into Cloudinary
 * and returns the resulting secure URL — no local filesystem use, so it works
 * on Vercel (ephemeral disk) without any extra config.
 *
 * The returned URL is a permanent `https://res.cloudinary.com/...` link that
 * the browser can load directly.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  // Fail loudly if the deploy is missing Cloudinary creds — otherwise the SDK
  // throws a cryptic "Must supply api_key" deep inside the request.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Server is missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the environment.",
      },
      { status: 500 },
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

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

  if (!ALLOWED_MIME.has(file.type)) {
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

  const buffer = Buffer.from(await file.arrayBuffer());

  let uploaded: UploadApiResponse;
  try {
    uploaded = await uploadToCloudinary(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `Cloudinary upload failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: uploaded.secure_url,
    sizeBytes: file.size,
    mimeType: file.type,
    publicId: uploaded.public_id,
  });
}

/**
 * Wrap `upload_stream` in a promise so we can `await` it. The SDK's stream is
 * the only way to upload a buffer without writing to disk first.
 */
function uploadToCloudinary(buffer: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "sat-platform/questions",
        resource_type: "image",
        // Cloudinary auto-detects format; explicit overwrite=false avoids
        // accidentally replacing another image if someone passes a stable id.
        overwrite: false,
        use_filename: false,
        unique_filename: true,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error("No result returned from Cloudinary"));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
