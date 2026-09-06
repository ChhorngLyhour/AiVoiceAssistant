require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();

// Enable CORS so your Netlify app can request tokens
app.use(cors());

app.get('/token', async (req, res) => {
  try {
    const roomName = req.query.room || 'voice-room-' + Math.random().toString(36).substring(7);
    const participantName = 'user-' + Math.random().toString(36).substring(7);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: "Missing LiveKit API Key or Secret on server" });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      roomCreate: true,
    });

    const token = await at.toJwt();

    res.json({
      token: token,
      url: process.env.LIVEKIT_URL || "wss://voiceai-1az4n5r4.livekit.cloud",
    });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Token server running on port ${PORT}`);
});