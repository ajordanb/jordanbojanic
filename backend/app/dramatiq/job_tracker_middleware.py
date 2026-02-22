import json
from datetime import datetime, UTC
from typing import Any, Optional
import redis
from dramatiq import Message, Middleware
from loguru import logger

class JobTrackerMiddleware(Middleware):
    """Tracks job lifecycle events in Redis for monitoring dashboard"""

    def __init__(self, redis_url: str, namespace: str, ttl: int = 86400):
        """
        Args:
            redis_url: Redis connection URL
            namespace: Redis key namespace
            ttl: Time-to-live for job records in seconds (default: 24 hours)
        """
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.namespace = namespace
        self.ttl = ttl

    def _get_job_key(self, message_id: str) -> str:
        return f"{self.namespace}:job:{message_id}"

    def _get_completed_set_key(self) -> str:
        return f"{self.namespace}:jobs:completed"

    def after_process_message(
        self, broker, message: Message, *, result: Any = None, exception: Optional[BaseException] = None
    ) -> None:
        """Track job completion"""
        try:
            job_data = {
                "message_id": message.message_id,
                "actor_name": message.actor_name,
                "queue_name": message.queue_name,
                "args": message.args,
                "kwargs": message.kwargs,
                "completed_at": datetime.now(UTC).isoformat(),
            }

            if exception:
                job_data["status"] = "failed"
                job_data["failed_at"] = job_data["completed_at"]
                job_data["error"] = str(exception)

            else:
                job_data["status"] = "completed"
                if result is not None:
                    try:
                        json.dumps(result)
                        job_data["result"] = result
                    except (TypeError, ValueError):
                        job_data["result"] = str(result)
            job_key = self._get_job_key(message.message_id)
            self.redis_client.setex(job_key, self.ttl, json.dumps(job_data))
            completed_key = self._get_completed_set_key()
            score = datetime.now(UTC).timestamp()
            self.redis_client.zadd(completed_key, {message.message_id: score})
            logger.debug(f"Tracked job completion: {message.message_id} ({job_data['status']})")
        except Exception as e:
            logger.error(f"Failed to track job {message.message_id}: {e}")
