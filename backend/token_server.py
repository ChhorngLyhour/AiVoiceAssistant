from flask import Flask, jsonify, request
from flask_cors import CORS
from livekit import api
import os

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("LIVEKIT_API_KEY", "APIjNNXfhtjH8Xc")
API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "LF8tpwpelAD5wQ0WAFyRUSdvPTNUxidK3ZYn8lY8F0F")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "wss://voiceai-1az4n5r4.livekit.cloud")

@app.route("/token")
def get_token():
    identity = "user-" + os.urandom(4).hex()
    
    token = api.AccessToken(API_KEY, API_SECRET)
    token.identity = identity
    
    # Enable automatic agent dispatch on room join
    grant = api.VideoGrants(
        room_join=True,
        room="voice_assistant_room",
        can_publish=True,
        can_subscribe=True,
        room_config=api.RoomConfiguration(
            agents=[api.RoomAgent(dispatch_on_create=True)]
        )
    )
    
    token.with_grants(grant)

    return jsonify({
        "url": LIVEKIT_URL,
        "token": token.to_jwt()
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)