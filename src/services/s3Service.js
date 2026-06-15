import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "claimlyt-s3-assets";
const PREFIX = "jobsdirect";

function buildKey(folder, originalName) {
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${PREFIX}/${folder}/${Date.now()}_${sanitized}`;
}

/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer - File contents
 * @param {string} folder - Subfolder (e.g. "cvs", "documents")
 * @param {string} originalName - Original file name
 * @param {string} mimeType - MIME type
 * @returns {{ key: string }} - The S3 object key
 */
async function uploadFile(buffer, folder, originalName, mimeType) {
  const key = buildKey(folder, originalName);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return { key };
}

/**
 * Upload HTML string content to S3.
 */
async function uploadHTML(html, folder, fileName) {
  const key = buildKey(folder, fileName);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.from(html, "utf-8"),
    ContentType: "text/html",
  }));
  return { key };
}

/**
 * Get a pre-signed download URL (valid for 1 hour).
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Delete an object from S3.
 */
async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Get file buffer from S3.
 */
async function getFileBuffer(key) {
  const { Body, ContentType } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of Body) {
    chunks.push(chunk);
  }
  return { buffer: Buffer.concat(chunks), contentType: ContentType };
}

export default { uploadFile, uploadHTML, getSignedDownloadUrl, deleteFile, getFileBuffer };
