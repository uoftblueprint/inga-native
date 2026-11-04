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
async function putFile(url: string, fileUri: string): Promise<void> {
  // Read the local photo file into memory as raw bytes so it can be the request body.
  const body = await (await fetch(fileUri)).blob();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "PUT",
      // Must match the content type the url was signed for, or storage returns 403.
      headers: { "Content-Type": CONTENT_TYPE },
      body,
    });
  } catch {
    throw new Error("Network error during upload");
  }
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
}

// Pretends to upload, can be used for testing the retry button
let fakeAttempts = 0;
async function fakeUpload() {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (fakeAttempts === 0) {
      fakeAttempts++;
      throw new Error("Fake failure (first attempt only)");
  }
}

/** Uploads a local photo to storage and tells the backend about it. */
export async function uploadPhoto(fileUri: string,): Promise<void> {
  if (USE_FAKE_UPLOAD) {
    // if you are testing with the fake upload
    return fakeUpload();
  }
  // Ask the backend for a temporary storage url and a key
  const { url, key } = await postJson<UploadUrlResponse>("/api/photos/upload-url/", {
    content_type: CONTENT_TYPE,
  });
  // Send the bytes straight to storage
  await putFile(url, fileUri);
  // Tell the backend the photo exists
  await postJson("/api/photos/", { key });
}