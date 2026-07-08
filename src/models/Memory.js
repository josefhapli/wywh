export default class Memory {
  constructor({
    id = null,
    organizationId = "",
    journeyId = "",
    authorId = "",
    title = "",
    message = "",
    location = null,
    mediaIds = [],
    status = "draft",
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.journeyId = journeyId;
    this.authorId = authorId;
    this.title = title;
    this.message = message;
    this.location = location;
    this.mediaIds = mediaIds;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

