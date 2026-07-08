export default class User {
  constructor({
    id = null,
    email = "",
    displayName = "",
    photoURL = "",
    defaultOrganizationId = "",
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.photoURL = photoURL;
    this.defaultOrganizationId = defaultOrganizationId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

