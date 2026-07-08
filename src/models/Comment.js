export default class Comment {
  constructor({
    id = null,
    organizationId = "",
    parentType = "memory",
    parentId = "",
    authorId = "",
    body = "",
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.parentType = parentType;
    this.parentId = parentId;
    this.authorId = authorId;
    this.body = body;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

