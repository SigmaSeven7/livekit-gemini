from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from google import genai
from google.genai import types
from livekit import rtc, api

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
    function_tool,
    utils,
    # Standardized Session Events
    AgentStateChangedEvent,
    UserStateChangedEvent,
    ConversationItemAddedEvent,
)
from livekit.plugins import google
from livekit.plugins import silero
from livekit.plugins import simli

# Ensure this file exists in your directory
from interview_prompts import INTERVIEW_PROMPTS

# Feature flag: Enable Simli avatar support
SIMLI_AVATAR_ENABLED = os.getenv("SIMLI_AVATAR_ENABLED", "false").lower() == "true"

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("gemini-playground")
logger.setLevel(logging.INFO)

# Server Constants
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or ""
MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025"

# R2 Storage configuration
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID") or ""
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY") or ""
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME") or ""
R2_ENDPOINT = os.getenv("R2_ENDPOINT") or ""

# SQLite database
DB_PATH = Path(__file__).parent / "transcripts.db"
TTL_MINUTES = 60  # Transcripts expire after 60 minutes


def init_database():
    logger.info(f"Initializing database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transcripts'")
    result = cursor.fetchone()

    if not result:
        logger.info("Creating transcripts table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transcripts (
                id TEXT PRIMARY KEY,
                room_name TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                audio_start_ms REAL,
                audio_end_ms REAL,
                audio_source_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ttl_expires_at TIMESTAMP
            )
        """)
        logger.info("transcripts table created successfully")
    else:
        # Check if ttl_expires_at column exists, add if not
        cursor.execute("PRAGMA table_info(transcripts)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'ttl_expires_at' not in columns:
            logger.info("Adding ttl_expires_at column to transcripts table...")
            cursor.execute("ALTER TABLE transcripts ADD COLUMN ttl_expires_at TIMESTAMP")
        logger.info("transcripts table already exists")

    conn.commit()
    conn.close()

def get_next_transcript_index(room_name: str) -> int:
    """Get the next index for a transcript in a room (1-based)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM transcripts WHERE room_name = ?",
            (room_name,)
        )
        count = cursor.fetchone()[0]
        conn.close()
        return count + 1  # 1-based index
    except Exception as e:
        logger.error(f"Failed to get transcript count: {e}")
        return 1


def save_transcript(room_name: str, role: str, content: str, audio_start_ms: float, audio_end_ms: float):
    """Save a transcript entry to the database."""
    try:
        # Generate ID in format: {index}-{room_name}
        index = get_next_transcript_index(room_name)
        transcript_id = f"{index}-{room_name}"
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO transcripts (id, room_name, role, content, audio_start_ms, audio_end_ms, audio_source_url, ttl_expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+60 minutes'))""",
            (transcript_id, room_name, role, content, audio_start_ms, audio_end_ms, f"interviews/{room_name}.mp4")
        )
        conn.commit()
        conn.close()
        logger.info(f"Saved {role} transcript [{audio_start_ms:.0f}ms - {audio_end_ms:.0f}ms] (id: {transcript_id}): {content[:50]}...")
    except Exception as e:
        logger.error(f"Failed to save transcript: {e}")


def cleanup_expired_transcripts():
    """Delete transcripts that have exceeded their TTL."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM transcripts WHERE ttl_expires_at < datetime('now')"
        )
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired transcripts")
    except Exception as e:
        logger.error(f"Failed to cleanup expired transcripts: {e}")


def start_cleanup_scheduler():
    """Start a background thread that runs cleanup every hour."""
    import threading
    
    def run_periodic_cleanup():
        while True:
            cleanup_expired_transcripts()
            # Run every hour (3600 seconds)
            time.sleep(3600)
    
    cleanup_thread = threading.Thread(target=run_periodic_cleanup, daemon=True)
    cleanup_thread.start()
    logger.info("Started TTL cleanup scheduler (runs every hour)")

@dataclass
class SessionConfig:
    gemini_api_key: str
    instructions: str
    model: str
    voice: str
    temperature: float
    max_response_output_tokens: str | int
    modalities: list[str]
    nano_banana_enabled: bool = False

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if k != "gemini_api_key"}

    @staticmethod
    def _modalities_from_string(modalities: str) -> list[str]:
        modalities_map = {
            "text_and_audio": ["TEXT", "AUDIO"],
            "text_only": ["TEXT"],
            "audio_only": ["AUDIO"],
        }
        return modalities_map.get(modalities, modalities_map["audio_only"])

    def __eq__(self, other) -> bool:
        return self.to_dict() == other.to_dict()

def build_interview_prompt_string(data: Dict[str, Any]) -> str:
    p = []
    p.append(INTERVIEW_PROMPTS.get("interviewer_role_prompts", {}).get(data.get("interviewer_role"), ""))
    p.append(INTERVIEW_PROMPTS.get("personality_prompts", {}).get(data.get("interviewer_personality"), ""))
    p.append(INTERVIEW_PROMPTS.get("mode_prompts", {}).get(data.get("interview_mode"), ""))
    p.append(INTERVIEW_PROMPTS.get("language_prompts", {}).get(data.get("interview_language"), ""))
    p.append(INTERVIEW_PROMPTS.get("difficulty_prompts", {}).get(str(data.get("difficulty_level", "")), ""))
    p.append(INTERVIEW_PROMPTS.get("gender_prompts", {}).get(data.get("gender_prompt"), ""))
    
    role = data.get("candidate_role", "Candidate")
    exp = data.get("experience_level", "N/A")
    p.append(f"Context: Interviewing a {role} with {exp} years of experience.")
    
    if data.get("job_description"):
        jd = str(data.get("job_description")).replace('"', "'").replace('\n', ' ')[:500]
        p.append(f"Job Description: {jd}")

    questions = data.get("interview_questions", [])
    if questions:
        q_list = "\n".join([f"- [{q['category']}] {q['question']}" for q in questions])
        p.append(f"\nPreparation Topics (do NOT read these aloud or follow them as a script):\n{q_list}\n")
        p.append(
            "INTERVIEWING STYLE: Conduct a natural, flowing human conversation — not a scripted Q&A. "
            "These topics are your internal preparation notes, not a list to recite. "
            "Introduce topics organically through conversation, never by reading them verbatim. "
            "After the candidate responds, dig deeper with follow-up questions before moving on — "
            "phrases like 'Can you elaborate on that?', 'What was the outcome?', 'What would you do differently?' "
            "should arise naturally. Only move to a new topic when the current thread is fully explored. "
            "It is far better to deeply explore 3–4 topics than to superficially touch all of them. "
            "NEVER say 'My next question is...' or read a question word-for-word from your preparation notes."
        )

    final_str = " ".join([str(x) for x in p if x]).strip()
    return final_str if final_str else "You are a helpful assistant."

def parse_session_config(data: Dict[str, Any]) -> SessionConfig:
    nano_banana_value = data.get("nano_banana_enabled", False)
    if isinstance(nano_banana_value, bool):
        nano_banana_enabled = nano_banana_value
    elif isinstance(nano_banana_value, str):
        nano_banana_enabled = nano_banana_value.lower() == "true"
    else:
        nano_banana_enabled = bool(nano_banana_value)
    
    if "interviewer_role" in data:
        instructions = build_interview_prompt_string(data)
    else:
        instructions = data.get("instructions", "")

    final_api_key = GEMINI_API_KEY if GEMINI_API_KEY else data.get("gemini_api_key", "")

    config = SessionConfig(
        gemini_api_key=final_api_key,
        instructions=instructions,
        model=MODEL_ID,
        voice="Charon",
        temperature=0.8,
        max_response_output_tokens=2048,
        modalities=SessionConfig._modalities_from_string(
            data.get("modalities", "text_and_audio")
        ),
        nano_banana_enabled=nano_banana_enabled,
    )
    return config

async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    
    try:
        metadata = json.loads(participant.metadata) if participant.metadata else {}
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse participant metadata: {e}. Using default config.")
        metadata = {}
    
    questions = metadata.get("questions", [])
    if questions:
        metadata["interview_questions"] = questions
        
    config = parse_session_config(metadata)
    
    session_manager = SessionManager(config)
    await session_manager.start_session(ctx, participant)

    logger.info("agent started")

def create_generate_image_tool(session_manager):
    raw_schema = {
        "type": "function",
        "name": "generate_image",
        "description": "Generate an image using Nano Banana and send it to the user",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Creative description of the image."}
            },
            "required": ["prompt"],
            "additionalProperties": False
        }
    }
    
    @function_tool(raw_schema=raw_schema)
    async def generate_image(raw_arguments: dict) -> str:
        prompt = raw_arguments["prompt"]
        try:
            client = genai.Client(api_key=session_manager.current_config.gemini_api_key)
            response = await asyncio.to_thread(
                lambda: client.models.generate_images(
                    model='imagen-4.0-fast-generate-001',
                    prompt=prompt,
                    config=types.GenerateImagesConfig(number_of_images=1, output_mime_type='image/jpeg'),
                )
            )
            image_bytes = response.generated_images[0].image.image_bytes
            img = Image.open(BytesIO(image_bytes))
            img.thumbnail((512, 512), Image.Resampling.LANCZOS)
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=90, optimize=True)
            image_data = buffer.getvalue()
            
            if session_manager.ctx and session_manager.participant:
                await session_manager.send_image_to_frontend(prompt, image_data)
            
            return "I've generated the image and sent it to your screen!"
        except Exception as e:
            return f"Sorry, I couldn't generate that image. Error: {str(e)}"
    return generate_image

class PlaygroundAgent(Agent):
    def __init__(self, instructions: str, tools=None, chat_ctx=None):
        if chat_ctx:
            super().__init__(instructions=instructions, tools=tools or [], chat_ctx=chat_ctx)
        else:
            super().__init__(instructions=instructions, tools=tools or [])


class IntervalTracker:
    """Tracks VAD speaking intervals and returns merged bounds per conversation turn."""
    def __init__(self):
        self.intervals: list[tuple[float, float]] = []
        self.current_start: float | None = None

    def start_speaking(self, now: float):
        if self.current_start is None:
            self.current_start = now

    def stop_speaking(self, now: float):
        if self.current_start is not None:
            self.intervals.append((self.current_start, now))
            self.current_start = None

    def pop_bounds(self, now: float) -> tuple[float, float]:
        # If still speaking when the transcript arrives, close the interval here.
        if self.current_start is not None:
            self.intervals.append((self.current_start, now))
            self.current_start = now

        if not self.intervals:
            return now - 0.5, now

        start_t = self.intervals[0][0]
        end_t = self.intervals[-1][1]
        self.intervals.clear()
        return start_t, end_t


class SessionManager:
    def __init__(self, config: SessionConfig):
        self.current_session: AgentSession | None = None
        self.current_config: SessionConfig = config
        self.ctx: JobContext | None = None
        self.participant: rtc.RemoteParticipant | None = None
        self.current_agent: PlaygroundAgent | None = None
        self.vad = silero.VAD.load(min_silence_duration=1.0)
        
        # Exact R2 sync zero-point
        self.recording_start_time = 0.0
        
        # Simli avatar session (conditionally initialized)
        self.avatar_session: simli.AvatarSession | None = None
        self.use_simli = SIMLI_AVATAR_ENABLED and os.getenv("SIMLI_API_KEY")
        
        self.agent_tracker = IntervalTracker()
        self.user_tracker = IntervalTracker()

    def create_session(self, config: SessionConfig) -> AgentSession:
        session = AgentSession(
            llm=google.realtime.RealtimeModel(
                model=config.model,
                voice=config.voice,
                temperature=config.temperature,
                max_output_tokens=int(config.max_response_output_tokens) if config.max_response_output_tokens != "inf" else None,
                api_key=config.gemini_api_key,
                thinking_config=types.ThinkingConfig(include_thoughts=False),
                realtime_input_config=types.RealtimeInputConfig(
                    automatic_activity_detection=types.AutomaticActivityDetection(
                        silence_duration_ms=1500,   # <-- controls the cutoff (ms)
                        start_of_speech_sensitivity="START_SENSITIVITY_LOW",
                        end_of_speech_sensitivity="END_SENSITIVITY_LOW",  # less aggressive cutoff
                    )
            ),
            ),
        )
        return session

    async def _start_r2_recording(self, room_name: str):
        if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT]):
            logger.warning("R2 credentials not fully configured. Skipping recording.")
            return

        try:
            lkapi = api.LiveKitAPI(
                os.getenv("LIVEKIT_URL"),
                os.getenv("LIVEKIT_API_KEY"),
                os.getenv("LIVEKIT_API_SECRET")
            )

            s3_output = api.S3Upload(
                access_key=R2_ACCESS_KEY_ID,
                secret=R2_SECRET_ACCESS_KEY,
                bucket=R2_BUCKET_NAME,
                endpoint=R2_ENDPOINT,
                force_path_style=True
            )

            egress_info = await lkapi.egress.start_room_composite_egress(
                api.RoomCompositeEgressRequest(
                    room_name=room_name,
                    file_outputs=[
                        api.EncodedFileOutput(
                            filepath=f"interviews/{room_name}.mp4",
                            s3=s3_output
                        )
                    ],
                    audio_only=True
                )
            )
            self.recording_start_time = time.time()
            
        except Exception as e:
            logger.exception(f"Failed to start recording: {e}")
        finally:
            await lkapi.aclose()

    async def start_session(self, ctx: JobContext, participant: rtc.RemoteParticipant):
        self.ctx = ctx
        self.participant = participant
        
        tools = []
        if self.current_config.nano_banana_enabled:
            tools.append(create_generate_image_tool(self))
        
        self.current_session = self.create_session(self.current_config)

        # 1. Conditionally initialize Simli avatar
        if self.use_simli:
            try:
                logger.info("Initializing Simli avatar...")
                self.avatar_session = simli.AvatarSession(
                    simli_config=simli.SimliConfig(
                        api_key=os.getenv("SIMLI_API_KEY"),
                        face_id=os.getenv("SIMLI_FACE_ID") or "",  # Use default if not specified
                        emotion_id=os.getenv("SIMLI_EMOTION_ID") or "neutral",
                    ),
                )
                
                # Start avatar and wait for it to join
                await self.avatar_session.start(session=self.current_session, room=ctx.room)
                logger.info("Simli avatar started successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Simli avatar: {e}. Falling back to agent-only mode.")
                self.use_simli = False
                self.avatar_session = None

        # 2. Establish the Zero Point
        await self._start_r2_recording(ctx.room.name)

        # 2. Track VAD directly into the Queues
        @self.current_session.on("agent_state_changed")
        def on_agent_state(event: AgentStateChangedEvent):
            t = time.time()
            if event.new_state == "speaking":
                self.agent_tracker.start_speaking(t)
            else:
                self.agent_tracker.stop_speaking(t)

        @self.current_session.on("user_state_changed")
        def on_user_state(event: UserStateChangedEvent):
            t = time.time()
            if event.new_state == "speaking":
                self.user_tracker.start_speaking(t)
            else:
                self.user_tracker.stop_speaking(t)

        # 3. Process Transcripts and apply Queue bounds
        @self.current_session.on("conversation_item_added")
        def on_item_added(event: ConversationItemAddedEvent):
            text = ""
            if hasattr(event.item, "text_content") and event.item.text_content:
                text = event.item.text_content
            elif isinstance(event.item.content, str):
                text = event.item.content
            elif isinstance(event.item.content, list):
                text = " ".join([c for c in event.item.content if isinstance(c, str)])

            if not text.strip():
                return

            now = time.time()
            role = "agent" if event.item.role == "assistant" else "candidate"

            if role == "agent":
                start_wall, end_wall = self.agent_tracker.pop_bounds(now)
            else:
                start_wall, end_wall = self.user_tracker.pop_bounds(now)

            raw_start_ms = (start_wall - self.recording_start_time) * 1000
            raw_end_ms = (end_wall - self.recording_start_time) * 1000

            # Agent pre-roll (1200ms) is mirrored in audio_server.py — keep in sync.
            # Candidate pre-roll is larger to compensate for browser mic latency.
            AGENT_PRE_SPEECH_PADDING_MS = 1200.0
            CANDIDATE_PRE_SPEECH_PADDING_MS = 2200.0
            POST_SPEECH_PADDING_MS = 600.0

            pre_padding = AGENT_PRE_SPEECH_PADDING_MS if role == "agent" else CANDIDATE_PRE_SPEECH_PADDING_MS
            start_ms = max(0.0, raw_start_ms - pre_padding)
            end_ms = max(0.0, raw_end_ms + POST_SPEECH_PADDING_MS)

            if end_ms <= start_ms:
                end_ms = start_ms + 1000.0

            save_transcript(
                room_name=ctx.room.name,
                role=role,
                content=text,
                audio_start_ms=start_ms,
                audio_end_ms=end_ms
            )

        self.current_agent = PlaygroundAgent(
            instructions=self.current_config.instructions,
            tools=tools
        )
        
        await self.current_session.start(room=ctx.room, agent=self.current_agent)
        
        await asyncio.sleep(3)
        for i in range(3):
            try:
                # Use a neutral nudge so the Realtime API gets a non-empty payload,
                # while the full interview prompt (with questions) stays in the base instructions.
                await self.current_session.generate_reply(
                    instructions="Begin the interview following your instructions."
                )
                break
            except Exception as e:
                logger.warning(f"failed to generate reply: {e}")
                await asyncio.sleep(1)

        @ctx.room.local_participant.register_rpc_method("pg.updateConfig")
        async def update_config(data: rtc.rpc.RpcInvocationData):
            if self.current_session is None or data.caller_identity != participant.identity:
                return json.dumps({"changed": False})
            new_config = parse_session_config(json.loads(data.payload))
            if self.current_config != new_config:
                old_config = self.current_config
                self.current_config = new_config
                await self.replace_session(ctx, participant, new_config, old_config)
                return json.dumps({"changed": True})
            return json.dumps({"changed": False})

    async def send_image_to_frontend(self, prompt: str, image_data: bytes):
        if not self.ctx or not self.participant: return
        try:
            writer = await self.ctx.room.local_participant.stream_bytes(
                name="generated_image.jpg", total_size=len(image_data),
                mime_type="image/jpeg", topic="nano_banana_image",
                destination_identities=[self.participant.identity],
            )
            await writer.write(image_data)
            await writer.aclose()
        except Exception as e:
            logger.error(f"Failed to send image: {e}")

    @utils.log_exceptions(logger=logger)
    async def replace_session(self, ctx: JobContext, participant: rtc.RemoteParticipant, config: SessionConfig, old_config: SessionConfig):
        if self.current_session is None or self.current_agent is None: return
        chat_ctx = None
        try:
            if hasattr(self.current_agent, 'chat_ctx'):
                chat_ctx = self.current_agent.chat_ctx
        except: pass
        
        await self.current_session.aclose()
        tools = [create_generate_image_tool(self)] if config.nano_banana_enabled else []
        
        self.current_session = self.create_session(config)
        self.current_agent = PlaygroundAgent(instructions=config.instructions, tools=tools, chat_ctx=chat_ctx)
        await self.current_session.start(room=ctx.room, agent=self.current_agent)
        # Append temporarily so we preserve base instructions (passing to generate_reply would replace them)
        original = self.current_agent.instructions
        await self.current_agent.update_instructions(
            f"{original}\n\n[For this turn only: Briefly acknowledge that the configuration has been updated, then continue the interview.]"
        )
        await self.current_session.generate_reply()
        await self.current_agent.update_instructions(original)  # Revert

if __name__ == "__main__":
    cli.run_app(WorkerOptions(agent_name='gemini-playground', entrypoint_fnc=entrypoint, worker_type=WorkerType.ROOM))