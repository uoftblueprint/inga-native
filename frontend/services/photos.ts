import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type PhotoResult =
  | { status: "success"; asset: ImagePicker.ImagePickerAsset }
  | { status: "cancelled" }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "unavailable" };

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.7;

/** Converts the picker's raw result into a PhotoResult */
function toResult(result: ImagePicker.ImagePickerResult): PhotoResult {
  if (result.canceled) {
    return { status: "cancelled" };
  }
  return { status: "success", asset: result.assets[0] };
}

export async function takePhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { status: "denied", canAskAgain: permission.canAskAgain };
  }

  try {
    // No `quality` here: compression happens once, in resizePhoto.
    return toResult(await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] }));
  } catch {
    // Thrown when the device has no camera, e.g. the iOS Simulator.
    return { status: "unavailable" };
  }
}

export async function pickPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: "denied", canAskAgain: permission.canAskAgain };
  }

  return toResult(
    await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] }),
  );
}

/** Downscales and recompresses as JPEG. */
export async function resizePhoto(asset: ImagePicker.ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_WIDTH) {
    context.resize({ width: MAX_WIDTH });
  }
  const image = await context.renderAsync();
  return image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
}