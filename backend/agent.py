import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins.google import beta as google
from livekit.plugins.noise_cancellation import BVC

from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

# Load .env locally; Render injects environment variables directly
load_dotenv()


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_INSTRUCTION
        )


async def entrypoint(ctx: agents.JobContext):
    # Connect to the room first
    await ctx.connect()

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            api_key=os.getenv("GOOGLE_API_KEY"),
            model="gemini-2.0-flash-exp",  # Correct LiveKit Gemini Multimodal model
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
            num_idle_processes=0,  # Keeps RAM under Render's 512MB limit
        )
    )