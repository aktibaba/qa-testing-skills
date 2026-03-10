# File Upload and Download Testing

## Principle
File upload testing must validate multipart encoding, file type restrictions, size limits, storage integration, and content integrity across the full upload-download lifecycle.

## Rationale
File handling is one of the most error-prone areas of web applications. Uploads can fail silently due to incorrect multipart encoding, exceed server memory when size limits are not enforced, or introduce security vulnerabilities when file type validation is bypassed. Storage backends like S3 add another layer of complexity with presigned URLs, bucket policies, and eventual consistency.

Testing file uploads requires generating real files of various types and sizes, verifying that the server correctly validates and stores them, and confirming that downloaded files match the originals byte-for-byte. In test environments, MinIO provides an S3-compatible local storage backend that eliminates the need for real AWS credentials. Tests should cover the happy path (valid uploads), security boundaries (malicious file types, oversized files), edge cases (empty files, unicode filenames), and the complete round-trip from upload to download.

## Pattern Examples

### 1. Multipart Upload API Testing

```typescript
// tests/uploads/file-upload-api.spec.ts
import { test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import FormData from 'form-data';

const APP_URL = 'http://localhost:3000';
const AUTH_HEADER = { Authorization: 'Bearer user-token' };

// Helper to generate test files
function generateTestFile(
  filename: string,
  sizeBytes: number,
  content?: Buffer,
): { path: string; hash: string } {
  const dir = path.join(__dirname, '__fixtures__');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  const data = content || crypto.randomBytes(sizeBytes);
  fs.writeFileSync(filePath, data);

  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return { path: filePath, hash };
}

function createSmallPng(): Buffer {
  // Minimal valid 1x1 red PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  );
}

function createSmallPdf(): Buffer {
  const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
  return Buffer.from(pdfContent);
}

test.describe('File Upload API', () => {
  test('uploads a single file successfully', async () => {
    const { path: filePath, hash } = generateTestFile('test-image.png', 0, createSmallPng());

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('description', 'Test image upload');

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(201);
    const result = await response.json();

    expect(result.id).toBeDefined();
    expect(result.filename).toBe('test-image.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.size).toBeGreaterThan(0);
    expect(result.url).toBeDefined();
    expect(result.checksum).toBe(hash);
  });

  test('uploads multiple files in a single request', async () => {
    const file1 = generateTestFile('doc1.pdf', 0, createSmallPdf());
    const file2 = generateTestFile('doc2.pdf', 0, createSmallPdf());

    const form = new FormData();
    form.append('files', fs.createReadStream(file1.path));
    form.append('files', fs.createReadStream(file2.path));

    const response = await fetch(`${APP_URL}/api/files/upload-multiple`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.files).toHaveLength(2);
    expect(result.files[0].filename).toBe('doc1.pdf');
    expect(result.files[1].filename).toBe('doc2.pdf');
  });

  test('rejects files exceeding size limit', async () => {
    const { path: filePath } = generateTestFile('large-file.bin', 11 * 1024 * 1024); // 11MB

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(413);
    const result = await response.json();
    expect(result.error).toMatch(/size|limit|too large/i);
  });

  test('rejects disallowed file types', async () => {
    const exeContent = Buffer.from('MZ' + '\x00'.repeat(100)); // Minimal EXE header
    const { path: filePath } = generateTestFile('malicious.exe', 0, exeContent);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toMatch(/type|format|not allowed/i);
  });

  test('validates file content type matches extension', async () => {
    // Create a PNG file but name it .pdf
    const { path: filePath } = generateTestFile('fake.pdf', 0, createSmallPng());

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toMatch(/mismatch|content type/i);
  });

  test('handles unicode filenames correctly', async () => {
    const { path: filePath } = generateTestFile('tëst-файл-文件.png', 0, createSmallPng());

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.filename).toContain('tëst');
  });

  test('handles empty file upload gracefully', async () => {
    const { path: filePath } = generateTestFile('empty.txt', 0, Buffer.alloc(0));

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toMatch(/empty/i);
  });
});
```

### 2. S3/MinIO Mock Integration

```yaml
# docker-compose.test.yml (MinIO section)
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5
```

```typescript
// tests/uploads/s3-integration.spec.ts
import { test, expect, beforeAll, afterAll } from 'vitest';
import { S3Client, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as fs from 'fs';
import FormData from 'form-data';

const APP_URL = 'http://localhost:3000';
const AUTH_HEADER = { Authorization: 'Bearer user-token' };

const s3Client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = 'test-uploads';

test.describe('S3 Storage Integration', () => {
  test('uploaded file is stored in S3 with correct metadata', async () => {
    const content = Buffer.from('Hello, S3 integration test!');
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

    const tmpPath = '/tmp/s3-test-file.txt';
    fs.writeFileSync(tmpPath, content);

    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath));

    const uploadResponse = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: { ...AUTH_HEADER, ...form.getHeaders() },
      body: form.getBuffer(),
    });

    expect(uploadResponse.status).toBe(201);
    const uploadResult = await uploadResponse.json();
    const s3Key = uploadResult.storageKey;

    // Verify file exists in S3
    const headResult = await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }));

    expect(headResult.ContentLength).toBe(content.length);
    expect(headResult.ContentType).toBe('text/plain');
    expect(headResult.Metadata?.['original-filename']).toBe('s3-test-file.txt');
    expect(headResult.Metadata?.['uploaded-by']).toBeDefined();

    // Verify file content matches
    const getResult = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }));

    const downloadedContent = await getResult.Body?.transformToByteArray();
    const downloadedHash = crypto
      .createHash('sha256')
      .update(Buffer.from(downloadedContent!))
      .digest('hex');

    expect(downloadedHash).toBe(expectedHash);
  });

  test('download returns the original file content', async () => {
    const originalContent = crypto.randomBytes(1024);
    const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex');

    const tmpPath = '/tmp/roundtrip-test.bin';
    fs.writeFileSync(tmpPath, originalContent);

    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath));

    const uploadResponse = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: { ...AUTH_HEADER, ...form.getHeaders() },
      body: form.getBuffer(),
    });

    const { id, url } = await uploadResponse.json();

    // Download via application API
    const downloadResponse = await fetch(`${APP_URL}/api/files/${id}/download`, {
      headers: AUTH_HEADER,
    });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get('content-disposition')).toContain('roundtrip-test.bin');

    const downloadedBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    expect(downloadedHash).toBe(originalHash);
    expect(downloadedBuffer.length).toBe(originalContent.length);
  });

  test('presigned URL provides time-limited access', async () => {
    const tmpPath = '/tmp/presigned-test.txt';
    fs.writeFileSync(tmpPath, 'Presigned URL test content');

    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath));

    const uploadResponse = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: { ...AUTH_HEADER, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    const { id } = await uploadResponse.json();

    // Get a presigned URL
    const presignResponse = await fetch(`${APP_URL}/api/files/${id}/presigned-url`, {
      headers: AUTH_HEADER,
    });
    expect(presignResponse.status).toBe(200);
    const { url, expiresAt } = await presignResponse.json();

    // URL should work without auth
    const directDownload = await fetch(url);
    expect(directDownload.status).toBe(200);
    const content = await directDownload.text();
    expect(content).toBe('Presigned URL test content');

    // Verify expiration is set
    const expiresDate = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = (expiresDate.getTime() - now.getTime()) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThan(0);
    expect(diffMinutes).toBeLessThanOrEqual(60); // max 1 hour
  });

  test('file deletion removes from both database and S3', async () => {
    const tmpPath = '/tmp/delete-test.txt';
    fs.writeFileSync(tmpPath, 'File to delete');

    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath));

    const uploadResponse = await fetch(`${APP_URL}/api/files/upload`, {
      method: 'POST',
      headers: { ...AUTH_HEADER, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    const { id, storageKey } = await uploadResponse.json();

    // Delete the file
    const deleteResponse = await fetch(`${APP_URL}/api/files/${id}`, {
      method: 'DELETE',
      headers: AUTH_HEADER,
    });
    expect(deleteResponse.status).toBe(204);

    // Verify it is gone from the API
    const getResponse = await fetch(`${APP_URL}/api/files/${id}`, {
      headers: AUTH_HEADER,
    });
    expect(getResponse.status).toBe(404);

    // Verify it is gone from S3
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageKey,
      }));
      expect.unreachable('Object should not exist in S3');
    } catch (error: any) {
      expect(error.name).toBe('NotFound');
    }
  });
});
```

### 3. Playwright File Upload/Download in Browser

```typescript
// tests/uploads/browser-upload.spec.ts
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

test.describe('Browser File Upload/Download', () => {
  test('uploads file via file input and shows preview', async ({ page }) => {
    await page.goto('/documents/upload');

    const filePath = path.join(__dirname, '__fixtures__', 'test-document.pdf');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '%PDF-1.4 test content');
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Verify preview appears
    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-name"]')).toHaveText('test-document.pdf');
    await expect(page.locator('[data-testid="file-size"]')).toBeVisible();

    // Submit the upload
    await page.locator('[data-testid="upload-submit"]').click();

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();
  });

  test('drag and drop file upload works', async ({ page }) => {
    await page.goto('/documents/upload');

    const filePath = path.join(__dirname, '__fixtures__', 'test-image.png');

    // Simulate drag and drop
    const dropzone = page.locator('[data-testid="dropzone"]');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    await dropzone.dispatchEvent('dragenter', { dataTransfer });
    await expect(dropzone).toHaveClass(/drag-active/);

    await dropzone.dispatchEvent('drop', { dataTransfer });

    // Use the setInputFiles approach as a reliable alternative
    const fileInput = page.locator('[data-testid="dropzone"] input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
  });

  test('downloads file and verifies content', async ({ page }) => {
    await page.goto('/documents');

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-btn"]').first().click();
    const download = await downloadPromise;

    // Verify download metadata
    expect(download.suggestedFilename()).toMatch(/\.(pdf|png|txt|csv)$/);

    // Save and verify file
    const downloadPath = path.join(__dirname, '__downloads__', download.suggestedFilename());
    const dir = path.dirname(downloadPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await download.saveAs(downloadPath);

    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(0);

    // Verify no download errors
    const failure = await download.failure();
    expect(failure).toBeNull();

    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('shows validation error for invalid file type in browser', async ({ page }) => {
    await page.goto('/documents/upload');

    const invalidFile = path.join(__dirname, '__fixtures__', 'test.exe');
    fs.writeFileSync(invalidFile, 'MZ fake exe');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFile);

    await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-error"]')).toContainText(
      /not allowed|invalid type/i,
    );

    // Upload button should be disabled
    await expect(page.locator('[data-testid="upload-submit"]')).toBeDisabled();

    fs.unlinkSync(invalidFile);
  });
});
```
