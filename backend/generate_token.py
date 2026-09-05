from livekit import api

# Your LiveKit API credentials
API_KEY = "APIjNNXfhtjH8Xc"
API_SECRET = "LF8tpwpelAD5wQ0WAFyRUSdvPTNUxidK3ZYn8lY8F0F"

# Create the access token
at = api.AccessToken(API_KEY, API_SECRET)
at.identity = "user1"   # assign user identity

# Assign grants (permissions)
grants = api.VideoGrants(room_join=True, room="test-room")
at.grants = grants

# Print token
print(at.to_jwt())
