import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

export const COLLECTIONS = {
  users: "users",
  organizations: "organizations",
  journeys: "journeys",
  memories: "memories",
  media: "media",
  albums: "albums",
  comments: "comments",
  notifications: "notifications",
  invitations: "invitations"
};

export function createFirestoreService(db) {
  function withTimestamps(data, isCreate = true) {
    return {
      ...data,
      ...(isCreate ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp()
    };
  }

  async function createDocument(collectionName, data) {
    const ref = await addDoc(collection(db, collectionName), withTimestamps(data));
    return ref.id;
  }

  async function setDocument(collectionName, id, data) {
    await setDoc(doc(db, collectionName, id), withTimestamps(data), { merge: true });
    return id;
  }

  async function getDocument(collectionName, id) {
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function updateDocument(collectionName, id, data) {
    await updateDoc(doc(db, collectionName, id), withTimestamps(data, false));
    return id;
  }

  async function deleteDocument(collectionName, id) {
    await deleteDoc(doc(db, collectionName, id));
  }

  async function listByField(collectionName, field, value, sortField = "createdAt", direction = "desc") {
    const q = query(
      collection(db, collectionName),
      where(field, "==", value),
      orderBy(sortField, direction)
    );
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  }

  return {
    createDocument,
    setDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    listByField
  };
}

