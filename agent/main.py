from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List

from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from google import genai
from google.genai import types
from livekit import rtc
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
)
from livekit.plugins import google
from livekit.plugins import silero

# וודא שהקובץ הזה קיים אצלך
from interview_prompts import INTERVIEW_PROMPTS

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("gemini-playground")
logger.setLevel(logging.INFO)

# הגדרות קבועות בשרת
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or ""
MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025"

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
        modalities_map: Dict[str, List[str]] = {
            "text_and_audio": ["TEXT", "AUDIO"],
            "text_only": ["TEXT"],
            "audio_only": ["AUDIO"],
        }
        return modalities_map.get(modalities, modalities_map["audio_only"])

    def __eq__(self, other) -> bool:
        return self.to_dict() == other.to_dict()

def build_interview_prompt_string(data: Dict[str, Any]) -> str:
    """Helper to build a clean string for the interview."""
    p = []
    
    # 1. שליפה בטוחה מהמילון
    p.append(INTERVIEW_PROMPTS.get("interviewer_role_prompts", {}).get(data.get("interviewer_role"), ""))
    p.append(INTERVIEW_PROMPTS.get("personality_prompts", {}).get(data.get("interviewer_personality"), ""))
    p.append(INTERVIEW_PROMPTS.get("mode_prompts", {}).get(data.get("interview_mode"), ""))
    p.append(INTERVIEW_PROMPTS.get("language_prompts", {}).get(data.get("interview_language"), ""))
    p.append(INTERVIEW_PROMPTS.get("difficulty_prompts", {}).get(str(data.get("difficulty_level", "")), ""))
    p.append(INTERVIEW_PROMPTS.get("gender_prompts", {}).get(data.get("gender_prompt"), ""))
    
    # 2. הוספת קונטקסט
    role = data.get("candidate_role", "Candidate")
    exp = data.get("experience_level", "N/A")
    p.append(f"Context: Interviewing a {role} with {exp} years of experience.")
    
    if data.get("job_description"):
        # ניקוי תווים בעייתיים מתיאור המשרה
        jd = str(data.get("job_description")).replace('"', "'").replace('\n', ' ')[:500]
        p.append(f"Job Description: {jd}")

    # 3. איחוד לטקסט שטוח (ללא ירידות שורה כפולות שעלולות לשבור את ה-Setup)
    final_str = " ".join([str(x) for x in p if x]).strip()
    
    # הדפסה ללוג כדי שתוכל לוודא
    print(f"DEBUG PROMPT: {final_str[:100]}...")
    
    return final_str if final_str else "You are a helpful assistant."


def parse_session_config(data: Dict[str, Any]) -> SessionConfig:
    # Nano Banana Logic (ללא שינוי)
    nano_banana_value = data.get("nano_banana_enabled", False)
    if isinstance(nano_banana_value, bool):
        nano_banana_enabled = nano_banana_value
    elif isinstance(nano_banana_value, str):
        nano_banana_enabled = nano_banana_value.lower() == "true"
    else:
        nano_banana_enabled = bool(nano_banana_value)
    
    # --- בניית ה-Instructions ---
    if "interviewer_role" in data:
        logger.info("Building interview instructions...")
        instructions = build_interview_prompt_string(data)
    else:
        instructions = data.get("instructions", "")

    # שימוש ב-API KEY הקבוע, ואם הוא ריק - ניסיון לקחת מה-DATA
    final_api_key = GEMINI_API_KEY if GEMINI_API_KEY else data.get("gemini_api_key", "")

    config = SessionConfig(
        gemini_api_key=final_api_key,
        instructions=instructions,
        model=MODEL_ID,  # שימוש בקבוע
        voice="Charon",    # שימוש בקול קבוע ותקין
        temperature=0.8, # שימוש בערך קבוע
        max_response_output_tokens=2048, # שימוש בערך קבוע
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
    
    config = parse_session_config(metadata)
    
    session_manager = SessionManager(config)
    await session_manager.start_session(ctx, participant)

    logger.info("agent started")

# --- כל הקוד מכאן ומטה זהה לחלוטין לקוד ה-Playground שעבד לך ---

def create_generate_image_tool(session_manager):
    raw_schema = {
        "type": "function",
        "name": "generate_image",
        "description": "Generate an image using Nano Banana and send it to the user",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Creative description of the image."
                }
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
            logger.error(f"Image generation failed: {e}")
            return f"Sorry, I couldn't generate that image. Error: {str(e)}"
    return generate_image

class PlaygroundAgent(Agent):
    def __init__(self, instructions: str, tools=None, chat_ctx=None):
        if chat_ctx:
            super().__init__(instructions=instructions, tools=tools or [], chat_ctx=chat_ctx)
        else:
            super().__init__(instructions=instructions, tools=tools or [])
        self.session_manager = None

class SessionManager:
    def __init__(self, config: SessionConfig):
        self.current_session: AgentSession | None = None
        self.current_config: SessionConfig = config
        self.ctx: JobContext | None = None
        self.participant: rtc.RemoteParticipant | None = None
        self.current_agent: PlaygroundAgent | None = None
        self.vad = silero.VAD.load()

    def create_session(self, config: SessionConfig) -> AgentSession:

      
        print(types.Modality.TEXT)
        print(types.Modality.AUDIO)
        print([types.Modality.TEXT, types.Modality.AUDIO])

        session = AgentSession(
            llm=google.realtime.RealtimeModel(
                model=config.model,
                voice=config.voice,
                temperature=config.temperature,
                max_output_tokens=int(config.max_response_output_tokens) if config.max_response_output_tokens != "inf" else None,
                #modalities=['TEXT', 'AUDIO'],
                api_key=config.gemini_api_key,
                thinking_config=types.ThinkingConfig(
                include_thoughts=False  # This captures reasoning in a separate field
                 ),
            ),
            vad=self.vad,
        )
        return session

    async def start_session(self, ctx: JobContext, participant: rtc.RemoteParticipant):
        self.ctx = ctx
        self.participant = participant
        
        tools = []
        if self.current_config.nano_banana_enabled:
            logger.info("Nano Banana tool enabled 🍌")
            tools.append(create_generate_image_tool(self))
        
        self.current_session = self.create_session(self.current_config)
        
        # Here we inject the instructions into the Agent
        self.current_agent = PlaygroundAgent(
            instructions=self.current_config.instructions,
            tools=tools
        )
        
        await self.current_session.start(
            room=ctx.room,
            agent=self.current_agent,
        )
        
        # Greet the user
       # Greet the user - updated with strict formatting constraints
        await self.current_session.generate_reply(
            instructions=(
                "Start the conversation by greeting the user and presenting yourself as the interviewer. Then ask the first question based on both the interviewer role and personality as well as the interviewee's role and personality."
            )
        )

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
            else:
                return json.dumps({"changed": False})

    async def send_image_to_frontend(self, prompt: str, image_data: bytes):
        if not self.ctx or not self.participant: return
        try:
            writer = await self.ctx.room.local_participant.stream_bytes(
                name="generated_image.jpg", total_size=len(image_data),
                mime_type="image/jpeg", topic="nano_banana_image",
                destination_identities=[self.participant.identity],
                attributes={"prompt": prompt, "type": "nano_banana_image"},
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
        
        tools = []
        if config.nano_banana_enabled:
            tools.append(create_generate_image_tool(self))
        
        self.current_session = self.create_session(config)
        self.current_agent = PlaygroundAgent(
            instructions=config.instructions,
            tools=tools,
            chat_ctx=chat_ctx
        )
        await self.current_session.start(room=ctx.room, agent=self.current_agent)
        await self.current_session.generate_reply(instructions="Configuration updated.")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(agent_name='gemini-playground', entrypoint_fnc=entrypoint, worker_type=WorkerType.ROOM))