import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export function createStorageService(storage) {
  async function uploadFile(path, file, metadata = {}) {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      storagePath: snapshot.ref.fullPath,
      downloadURL,
      contentType: file.type || metadata.contentType || ""
    };
  }

  function mediaPath({ organizationId, mediaId, fileName }) {
    return `organizations/${organizationId}/media/${mediaId}-${fileName}`;
  }

  return {
    uploadFile,
    mediaPath
  };
}

