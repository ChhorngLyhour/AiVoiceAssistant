import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins.google import beta as google
from livekit.plugins.noise_cancellation import BVC

from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

load_dotenv()

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_INSTRUCTION
        )

async def entrypoint(ctx: agents.JobContext):
    # Connect worker to the room assigned by LiveKit
    await ctx.connect()

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            api_key=os.getenv("GOOGLE_API_KEY"),
            model="gemini-2.0-flash-exp",
            voice="Charon",
            instructions=SESSION_INSTRUCTION,
        )
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            noise_cancellation=BVC(),
        ),
    )

if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            num_idle_processes=0,
        )
    )