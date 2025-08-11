import axios from "axios";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
  });
}

const db = admin.firestore();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;

export default async function handler(req, res) {
  try {
    const { userId, reward } = req.query;

    // Vérifier si membre du canal
    const check = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      params: { chat_id: CHANNEL, user_id: userId }
    });

    if (check.data.result.status !== "left") {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const currentBalance = userDoc.exists ? userDoc.data().balance || 0 : 0;

      await userRef.set({ balance: currentBalance + parseInt(reward) }, { merge: true });
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
