import * as ImagePicker from 'expo-image-picker';

export type PhotoResult =
  | { status: 'success'; asset: ImagePicker.ImagePickerAsset }
  | { status: 'cancelled' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable' };

export async function takePhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    return { status: 'denied', canAskAgain: permission.canAskAgain };
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled) {
      return { status: 'cancelled' };
    }
    return { status: 'success', asset: result.assets[0] };
  } catch {
    // Thrown when there is no camera
    return { status: 'unavailable' };
  }
}