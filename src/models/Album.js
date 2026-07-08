export default class Album {
  constructor({
    id = null,
    organizationId = "",
    journeyId = "",
    title = "",
    description = "",
    memoryIds = [],
    mediaIds = [],
    createdBy = "",
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.journeyId = journeyId;
    this.title = title;
    this.description = description;
    this.memoryIds = memoryIds;
    this.mediaIds = mediaIds;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

