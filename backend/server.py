from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from livekit import api

load_dotenv(".env.local")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/get-token")
def get_token():
    identity = "user-" + os.urandom(4).hex()
    room_name = "test-room"

    at = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    grant = api.VideoGrant(room_join=True, room=room_name)
    at.add_grant(grant)
    at.identity = identity
    token = at.to_jwt()

    return {"url": LIVEKIT_URL, "token": token}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
