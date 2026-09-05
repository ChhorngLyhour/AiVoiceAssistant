
from flask import Flask, jsonify
from flask_cors import CORS
from livekit import api
import os

app = Flask(__name__)
CORS(app)

API_KEY = "APIjNNXfhtjH8Xc"
API_SECRET = "LF8tpwpelAD5wQ0WAFyRUSdvPTNUxidK3ZYn8lY8F0F"
LIVEKIT_URL = "wss://voiceai-1az4n5r4.livekit.cloud"

@app.route("/token")
def get_token():
    identity = "user-" + os.urandom(4).hex()
    
    # 1. Initialize AccessToken
    token = api.AccessToken(API_KEY, API_SECRET)
    token.identity = identity
    
    # 2. Attach VideoGrants properly using VideoGrant/VideoGrants
    grant = api.VideoGrants(
        room_join=True,
        room="test-room",
        can_publish=True,
        can_subscribe=True
    )
    
    # 3. Use with_grants or add_grant depending on exact class binding
    token.with_grants(grant)

    # 4. Generate JWT string
    jwt_token = token.to_jwt()

    return jsonify({
        "url": LIVEKIT_URL,
        "token": jwt_token
    })

# if __name__ == "__main__":
#     app.run(host="127.0.0.1", port=8000, debug=True)

if __name__ == "__main__":
    # Render assigns a dynamic port; fallback to 8000 for local testing
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)