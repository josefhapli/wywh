export default class Invitation {
  constructor({
    id = null,
    organizationId = "",
    journeyId = "",
    email = "",
    role = "member",
    invitedBy = "",
    status = "pending",
    token = "",
    expiresAt = null,
    createdAt = null
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.journeyId = journeyId;
    this.email = email;
    this.role = role;
    this.invitedBy = invitedBy;
    this.status = status;
    this.token = token;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }
}

