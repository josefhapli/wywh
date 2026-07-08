export default class Journey {
  constructor({
    id = null,
    organizationId = "",
    title = "",
    description = "",
    coverMediaId = "",
    createdBy = "",
    visibility = "organization",
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.title = title;
    this.description = description;
    this.coverMediaId = coverMediaId;
    this.createdBy = createdBy;
    this.visibility = visibility;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

