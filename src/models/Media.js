export default class Media {
  constructor({
    id = null,
    organizationId = "",
    journeyId = "",
    memoryId = "",
    uploadedBy = "",
    storagePath = "",
    downloadURL = "",
    contentType = "",
    width = null,
    height = null,
    createdAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.journeyId = journeyId;
    this.memoryId = memoryId;
    this.uploadedBy = uploadedBy;
    this.storagePath = storagePath;
    this.downloadURL = downloadURL;
    this.contentType = contentType;
    this.width = width;
    this.height = height;
    this.createdAt = createdAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

