// firestore.js

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export async function createOrderRecord(draft) {
  return await addDoc(collection(db, "orders"), {
    orderId: draft.orderId,

    status: "queued",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    recipient: {
      name: draft.recipient,
      address: draft.address,
      city: draft.city,
      state: draft.state,
      zip: draft.zip
    },

    memory: {
      message: draft.message,
      image: draft.image
    },

    keepsake: {
      type: "postcard",
      quantity: 1
    }

  });
}