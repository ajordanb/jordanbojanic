import asyncio
from typing import Dict, Any

import dramatiq
import redis
from loguru import logger

from app.db.db_manager import DatabaseManager

async def check_redis(redis_client: redis.Redis, health_check_timeout: float = 3.0) -> Dict[str, Any]:
    """Check Redis health with timeout and async safety"""
    if redis_client is None:
        return {"status": "unhealthy", "type": "redis", "error": "Redis client not initialized"}
    try:
        async with asyncio.timeout(health_check_timeout):
            await asyncio.to_thread(redis_client.ping)
        return {"status": "healthy", "type": "redis"}
    except asyncio.TimeoutError:
        logger.warning("Redis health check timed out")
        return {"status": "unhealthy", "type": "redis", "error": "Health check timed out"}
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        return {"status": "unhealthy", "type": "redis", "error": str(e)}


async def check_database(db_manager: DatabaseManager, health_check_timeout: float = 3.0) -> Dict[str, Any]:
    """Check database health with timeout"""
    try:
        async with asyncio.timeout(health_check_timeout):
            healthy = await db_manager.health_check()
        return {"status": "healthy" if healthy else "unhealthy", "type": "mongodb"}
    except asyncio.TimeoutError:
        logger.warning("Database health check timed out")
        return {"status": "unhealthy", "type": "mongodb", "error": "Health check timed out"}
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        return {"status": "unhealthy", "type": "mongodb", "error": str(e)}


async def check_dramatiq() -> Dict[str, Any]:
    """Check Dramatiq broker health"""
    try:
        broker = dramatiq.get_broker()
        return {"status": "healthy", "type": "dramatiq", "broker": broker.__class__.__name__}
    except Exception as e:
        logger.warning(f"Dramatiq health check failed: {e}")
        return {"status": "unhealthy", "type": "dramatiq", "error": str(e)}