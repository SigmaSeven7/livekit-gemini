import os
import boto3
import sqlite3
import time
import threading
from botocore.config import Config
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path

load_dotenv(dotenv_path=".env.local")

app = Flask(__name__)

# Enable CORS for localhost:3000
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# R2 Configuration
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")

# Configure boto3 client for R2 (S3-compatible)
r2_client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
)

# Database path
DB_PATH = Path(__file__).parent / "transcripts.db"


def init_database():
    """Initialize the database schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transcripts'")
    result = cursor.fetchone()

    if not result:
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
        print("Created transcripts table")

    conn.commit()
    conn.close()


def cleanup_expired_transcripts():
    """Delete transcripts that have exceeded their TTL."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transcripts WHERE ttl_expires_at < datetime('now')")
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} expired transcripts")
    except Exception as e:
        print(f"Failed to cleanup expired transcripts: {e}")


def start_cleanup_scheduler():
    """Start a background thread that runs cleanup every hour."""
    def run_periodic_cleanup():
        while True:
            cleanup_expired_transcripts()
            time.sleep(3600)
    
    cleanup_thread = threading.Thread(target=run_periodic_cleanup, daemon=True)
    cleanup_thread.start()
    print("Started TTL cleanup scheduler (runs every hour)")


# Initialize database and start scheduler on module load
init_database()
start_cleanup_scheduler()


def get_transcript_count(room_name: str) -> int:
    """Return the number of transcript segments for a room."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM transcripts WHERE room_name = ?", (room_name,))
        count = cursor.fetchone()[0]
        conn.close()
        return count
    except Exception as e:
        print(f"Error fetching transcript count: {e}")
        return 0


# Must match PRE_SPEECH_PADDING_MS in main.py — used to reconstruct the actual
# agent audio start in the composite recording (saved_start = raw_start - padding).
_AGENT_PRE_ROLL_MS = 1200.0
# Gap to leave between the end of a candidate clip and the start of agent audio.
_CANDIDATE_END_BUFFER_MS = 150.0


def get_transcripts(room_name: str):
    """Fetch transcripts from SQLite database for a given room."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """SELECT id, room_name, role, content, audio_start_ms, audio_end_ms, audio_source_url, created_at
               FROM transcripts WHERE room_name = ? ORDER BY created_at ASC""",
            (room_name,)
        )

        rows = cursor.fetchall()
        conn.close()

        transcripts = []
        for row in rows:
            # Parse the ID to extract the index number (format: {index}-{room_name})
            raw_id = str(row["id"])
            # Extract the index from the beginning of the ID
            idx = raw_id.split("-")[0] if raw_id else "0"
            transcripts.append({
                "transcriptId": idx,  # Return just the index number
                "interviewId": room_name,
                "participant": row["role"],
                "transcript": row["content"],
                "timestampStart": row["audio_start_ms"],
                "timestampEnd": row["audio_end_ms"],
                "audioUrl": None,
                "audioBase64": None,
            })

        # Sort by start time so adjacency checks are reliable.
        transcripts.sort(key=lambda t: t["timestampStart"] or 0)

        # Cap each candidate clip so it ends before the next agent clip's actual
        # audio begins in the composite recording.  Because agent clips are stored
        # with a pre-roll already subtracted, the real agent audio start is:
        #   agent.timestampStart + _AGENT_PRE_ROLL_MS
        for i, t in enumerate(transcripts):
            if t["participant"] != "candidate":
                continue
            for j in range(i + 1, len(transcripts)):
                if transcripts[j]["participant"] == "agent":
                    actual_agent_audio_start = (transcripts[j]["timestampStart"] or 0) + _AGENT_PRE_ROLL_MS
                    cap = actual_agent_audio_start - _CANDIDATE_END_BUFFER_MS
                    if (t["timestampEnd"] or 0) > cap:
                        t["timestampEnd"] = cap
                    break

        return transcripts

    except Exception as e:
        print(f"Error fetching transcripts: {e}")
        return []


@app.route("/getTranscripts", methods=["GET"])
def get_transcripts_route():
    """
    Lightweight endpoint to get transcripts only (no audio/R2).
    Query param: id - the interview/room ID.
    Returns JSON: { transcripts: [...] }
    """
    audio_id = request.args.get("id")
    if not audio_id:
        return jsonify({"error": "Missing 'id' parameter"}), 400
    transcripts = get_transcripts(audio_id)
    return jsonify({"transcripts": transcripts})


@app.route("/getTranscriptCount", methods=["GET"])
def get_transcript_count_route():
    """
    Lightweight endpoint to get transcript count for an interview.
    Query param: id - the interview/room ID.
    Returns JSON: { count: number }
    """
    audio_id = request.args.get("id")
    if not audio_id:
        return jsonify({"error": "Missing 'id' parameter"}), 400
    count = get_transcript_count(audio_id)
    return jsonify({"count": count})


@app.route("/getAudioFile", methods=["GET"])
def get_audio_file():
    """
    Endpoint to fetch audio file and transcripts from R2 storage.
    Query param: id - the interview/room ID (e.g., '51fe7e90-f4f2-452b-9965-7cd69e38accf')

    Returns JSON with:
    - audioUrl: URL to fetch the full audio file
    - transcripts: array of transcript segments with timestamps
    """
    audio_id = request.args.get("id")

    if not audio_id:
        return jsonify({"error": "Missing 'id' parameter"}), 400

    try:
        # Fetch transcripts from database
        transcripts = get_transcripts(audio_id)

        # Generate a presigned URL for the audio file
        s3_key = f"interviews/{audio_id}.ogg"
        presigned_url = r2_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": R2_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=3600,
        )

        # Update transcripts with the audio URL
        for transcript in transcripts:
            transcript["audioUrl"] = presigned_url

        return jsonify({
            "audioUrl": presigned_url,
            "transcripts": transcripts,
        })

    except r2_client.exceptions.NoSuchKey:
        return jsonify({"error": f"Audio file not found for id: {audio_id}"}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to fetch audio: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


def delete_transcripts(room_name: str) -> int:
    """Delete all transcript segments for a given room."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transcripts WHERE room_name = ?", (room_name,))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted_count
    except Exception as e:
        print(f"Error deleting transcripts: {e}")
        return 0


@app.route("/interviews/<room_name>", methods=["DELETE"])
def delete_interview(room_name: str):
    """
    Delete all transcripts for a specific interview/room.
    Path param: room_name - the interview/room ID.
    Returns JSON: { success: true, deleted: number }
    """
    try:
        deleted_count = delete_transcripts(room_name)
        return jsonify({
            "success": True,
            "deleted": deleted_count,
        })
    except Exception as e:
        return jsonify({"error": f"Failed to delete transcripts: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3003))
    app.run(host="0.0.0.0", port=port, debug=True)
