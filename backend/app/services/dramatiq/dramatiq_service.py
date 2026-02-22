from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, UTC
import redis
import json
from fastapi import HTTPException
from loguru import logger

from app.core.config import settings


class DramatiqJob:
    def __init__(self, data: Dict[str, Any]):
        self.message_id = data.get('message_id')
        self.actor_name = data.get('actor_name')
        self.queue_name = data.get('queue_name', 'default')
        self.args = data.get('args', [])
        self.kwargs = data.get('kwargs', {})
        self.options = data.get('options', {})
        self.created_at = data.get('created_at')
        self.started_at = data.get('started_at')
        self.completed_at = data.get('completed_at')
        self.failed_at = data.get('failed_at')
        self.retries = data.get('retries', 0)
        self.max_retries = data.get('max_retries', 3)
        self.status = self._determine_status()
        self.result = data.get('result')
        self.error = data.get('error')

    def _determine_status(self) -> str:
        if self.failed_at:
            return "failed"
        elif self.completed_at:
            return "completed"
        elif self.started_at:
            return "running"
        else:
            return "pending"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message_id": self.message_id,
            "actor_name": self.actor_name,
            "queue_name": self.queue_name,
            "args": self.args,
            "kwargs": self.kwargs,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "failed_at": self.failed_at,
            "retries": self.retries,
            "max_retries": self.max_retries,
            "result": self.result,
            "error": self.error
        }


class DramatiqService:
    """Service for monitoring and managing Dramatiq jobs"""

    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.namespace = settings.dramatiq_namespace

    def _get_queue_key(self, queue_name: str = "default") -> str:
        return f"{self.namespace}:queue:{queue_name}"

    def _get_result_key(self, message_id: str) -> str:
        return f"{self.namespace}:result:{message_id}"

    def _get_message_key(self, message_id: str) -> str:
        return f"{self.namespace}:message:{message_id}"

    def _get_job_key(self, message_id: str) -> str:
        """Get key for tracked job data"""
        return f"{self.namespace}:job:{message_id}"

    def _get_completed_jobs_set_key(self) -> str:
        """Get key for completed jobs sorted set"""
        return f"{self.namespace}:jobs:completed"

    async def _get_completed_jobs(self, limit: int = 100) -> List[DramatiqJob]:
        """Get completed jobs from job tracker"""
        try:
            redis_client = self.redis_client
            completed_key = self._get_completed_jobs_set_key()

            # Get most recent completed job IDs
            message_ids = redis_client.zrevrange(completed_key, 0, limit - 1)
            jobs = []

            for message_id in message_ids:
                job_key = self._get_job_key(message_id)
                job_data = redis_client.get(job_key)

                if job_data:
                    try:
                        job_dict = json.loads(job_data)
                        jobs.append(DramatiqJob(job_dict))
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse job {message_id}: {e}")
                        continue

            return jobs

        except Exception as e:
            logger.error(f"Failed to get completed jobs: {e}")
            return []

    async def get_all_jobs(self, queue_name: str = "default", limit: int = 100) -> List[DramatiqJob]:
        """Get all jobs from a specific queue, including pending and completed jobs"""
        try:
            redis_client = self.redis_client
            queue_key = self._get_queue_key(queue_name)

            # Get pending jobs from queue
            job_data_list = redis_client.lrange(queue_key, 0, limit - 1)
            jobs = []

            for job_data in job_data_list:
                try:
                    parsed_data = json.loads(job_data)
                    job = DramatiqJob(parsed_data)
                    jobs.append(job)
                except (json.JSONDecodeError, Exception) as e:
                    logger.warning(f"Failed to parse job data: {e}")
                    continue

            # Get completed jobs from tracker
            completed_jobs = await self._get_completed_jobs(limit=limit)

            # Filter by queue if needed
            if queue_name and queue_name != "default":
                completed_jobs = [j for j in completed_jobs if j.queue_name == queue_name]

            jobs.extend(completed_jobs)

            return jobs[:limit]
        except Exception as e:
            logger.error(f"Failed to get jobs: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve jobs: {str(e)}")

    async def get_job_by_id(self, message_id: str) -> Optional[DramatiqJob]:
        """Get a specific job by message ID"""
        try:
            redis_client = self.redis_client
            message_key = self._get_message_key(message_id)
            result_key = self._get_result_key(message_id)

            # Get job data
            job_data = redis_client.get(message_key)
            if not job_data:
                return None

            parsed_data = json.loads(job_data)

            # Get result if available
            result_data = redis_client.get(result_key)
            if result_data:
                try:
                    parsed_data['result'] = json.loads(result_data)
                except json.JSONDecodeError:
                    parsed_data['result'] = result_data

            return DramatiqJob(parsed_data)
        except Exception as e:
            logger.error(f"Failed to get job {message_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve job: {str(e)}")

    async def get_queue_stats(self, queue_name: str = "default") -> Dict[str, Any]:
        """Get statistics for a specific queue"""
        try:
            redis_client = self.redis_client
            queue_key = self._get_queue_key(queue_name)

            # Get queue length
            queue_length = redis_client.llen(queue_key)

            # Get jobs and calculate stats
            jobs = await self.get_all_jobs(queue_name, limit=1000)

            stats = {
                "queue_name": queue_name,
                "total_jobs": len(jobs),
                "pending_jobs": queue_length,
                "completed_jobs": len([j for j in jobs if j.status == "completed"]),
                "failed_jobs": len([j for j in jobs if j.status == "failed"]),
                "running_jobs": len([j for j in jobs if j.status == "running"]),
            }

            return stats
        except Exception as e:
            logger.error(f"Failed to get queue stats for {queue_name}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get queue stats: {str(e)}")

    async def get_all_queues(self) -> List[str]:
        """Get list of all available queues"""
        try:
            redis_client = self.redis_client
            pattern = f"{self.namespace}:queue:*"
            keys = redis_client.keys(pattern)

            # Extract queue names
            queues = []
            for key in keys:
                queue_name = key.replace(f"{self.namespace}:queue:", "")
                queues.append(queue_name)

            return queues if queues else ["default"]
        except Exception as e:
            logger.error(f"Failed to get queues: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get queues: {str(e)}")

    async def cancel_job(self, message_id: str) -> bool:
        """Cancel a pending job"""
        try:
            redis_client = self.redis_client
            queues = await self.get_all_queues()
            for queue_name in queues:
                queue_key = self._get_queue_key(queue_name)
                jobs = redis_client.lrange(queue_key, 0, -1)

                for i, job_data in enumerate(jobs):
                    try:
                        parsed_data = json.loads(job_data)
                        if parsed_data.get('message_id') == message_id:
                            redis_client.lrem(queue_key, 1, job_data)
                            message_key = self._get_message_key(message_id)
                            parsed_data['cancelled_at'] = datetime.now(UTC).isoformat()
                            redis_client.set(message_key, json.dumps(parsed_data))
                            return True
                    except json.JSONDecodeError:
                        continue

            return False
        except Exception as e:
            logger.error(f"Failed to cancel job {message_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")

    async def retry_failed_job(self, message_id: str) -> bool:
        """Retry a failed job"""
        try:
            job = await self.get_job_by_id(message_id)
            if not job or job.status != "failed":
                return False

            redis_client = self.redis_client
            queue_key = self._get_queue_key(job.queue_name)

            # Reset job status and add back to queue
            job_data = job.to_dict()
            job_data['failed_at'] = None
            job_data['error'] = None
            job_data['retries'] = job_data.get('retries', 0) + 1

            # Add back to queue
            redis_client.lpush(queue_key, json.dumps(job_data))

            # Update message store
            message_key = self._get_message_key(message_id)
            redis_client.set(message_key, json.dumps(job_data))

            return True
        except Exception as e:
            logger.error(f"Failed to retry job {message_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retry job: {str(e)}")

    async def clear_queue(self, queue_name: str = "default") -> int:
        """Clear all jobs from a queue"""
        try:
            redis_client = self.redis_client
            queue_key = self._get_queue_key(queue_name)

            # Get count before clearing
            count = redis_client.llen(queue_key)

            # Clear the queue
            redis_client.delete(queue_key)

            return count
        except Exception as e:
            logger.error(f"Failed to clear queue {queue_name}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to clear queue: {str(e)}")

    async def get_broker_info(self) -> Dict[str, Any]:
        """Get general broker information"""
        try:
            redis_client = self.redis_client
            info = redis_client.info()

            broker_info = {
                "redis_version": info.get("redis_version"),
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human"),
                "total_commands_processed": info.get("total_commands_processed"),
                "namespace": self.namespace,
                "broker_url": settings.dramatiq_broker_url.split('@')[-1] if '@' in settings.dramatiq_broker_url else settings.dramatiq_broker_url
            }

            return broker_info
        except Exception as e:
            logger.error(f"Failed to get broker info: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get broker info: {str(e)}")