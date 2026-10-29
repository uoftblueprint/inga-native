const API_URL = process.env.EXPO_PUBLIC_API_URL;
const CONTENT_TYPE = "image/jpeg";

const USE_FAKE_UPLOAD = true;

type UploadUrlResponse = { url: string; key: string }; // url is where the file goes, key is file's name in storage

// send JSON to backend and get JSON back
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

// Load the photo file's bytes into memory for upload
async function putFile(
  url: string,
  fileUri: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Upload the bytes with XMLHttpRequest
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Must match the content type the url was signed for, or storage returns 403.
    xhr.setRequestHeader("Content-Type", CONTENT_TYPE);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(blob);
  });
}

// Pretends to upload, can be used for testing the retry button
let fakeAttempts = 0;
async function fakeUpload(onProgress: (fraction: number) => void) {
  for (let step = 1; step <= 10; step++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    onProgress(step / 10);
    if (fakeAttempts === 0 && step === 5) {
      fakeAttempts++;
      throw new Error("Fake failure (first attempt only)");
    }
  }
}

/** Uploads a local photo to storage and tells the backend about it. */
export async function uploadPhoto(
  fileUri: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  if (USE_FAKE_UPLOAD) {
    // if you are testing with the fake upload
    return fakeUpload(onProgress);
  }

  // Ask the backend for a temporary storage url and a key
  const { url, key } = await postJson<UploadUrlResponse>("/api/photos/upload-url/", {
    content_type: CONTENT_TYPE,
  });
  // Send the bytes straight to storage
  await putFile(url, fileUri, onProgress);
  // Tell the backend the photo exists
  await postJson("/api/photos/", { key });
}