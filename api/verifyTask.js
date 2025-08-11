import axios from "axios";
import admin from "firebase-admin";
import crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
  });
}

const db = admin.firestore();
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;

function verifyTelegramInitData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const _hash = crypto.createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return _hash === hash;
}

export default async function handler(req, res) {
  try {
    const { userId, reward, initData } = req.query;

    // Vérification sécurité
    if (!verifyTelegramInitData(initData)) {
      return res.status(403).json({ success: false, message: "InitData invalide" });
    }

    // Vérifier si membre du canal
    const check = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      params: { chat_id: CHANNEL, user_id: userId }
    });

    if (!check.data.ok) {
      return res.status(500).json({ success: false, message: "Erreur Telegram API" });
    }

    if (check.data.result.status !== "left") {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const currentBalance = userDoc.exists ? userDoc.data().balance || 0 : 0;

      await userRef.set({ balance: currentBalance + parseInt(reward) }, { merge: true });
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({ success: false, message: "Utilisateur non membre du canal" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
