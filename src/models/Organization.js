export default class Organization {
  constructor({
    id = null,
    name = "",
    slug = "",
    ownerId = "",
    memberIds = [],
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.ownerId = ownerId;
    this.memberIds = memberIds;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

