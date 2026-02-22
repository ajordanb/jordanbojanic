import os
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger
import questionary

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


def start_local_redis():
    os.system(
        "docker compose -f redis-docker-compose.yaml pull && docker compose -f redis-docker-compose.yaml down"
    )
    os.system("docker compose -f redis-docker-compose.yaml up -d")
    logger.success("Redis started")
    logger.info("Dashboard available in 6379")



def start_api_only():
    """Start just the FastAPI server for development"""
    logger.info("🌐 Starting FastAPI server only...")
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    os.system("uvicorn app.main:app --reload --host 127.0.0.1 --port 8000")


def start_workers_only():
    """Start just the Dramatiq workers for development"""
    logger.info("⚙️  Starting Dramatiq workers only...")
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    os.system("dramatiq app.tasks.background_tasks --watch app --processes 1 --threads 2")


actions = {
    "API Only": start_api_only,
    "Workers Only": start_workers_only,
    "Local Redis": start_local_redis,
}


if __name__ == "__main__":
    action = questionary.select(
        "Tools - what do you want to do?", choices=list(actions.keys())
    ).ask()
    result = actions[action]()
