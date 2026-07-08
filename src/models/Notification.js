export default class Notification {
  constructor({
    id = null,
    userId = "",
    type = "",
    title = "",
    body = "",
    readAt = null,
    createdAt = null,
    data = {}
  } = {}) {
    this.id = id;
    this.userId = userId;
    this.type = type;
    this.title = title;
    this.body = body;
    this.readAt = readAt;
    this.createdAt = createdAt;
    this.data = data;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

