from typing import Any

import dramatiq
from dramatiq import Broker, Worker
from dramatiq.asyncio import EventLoopThread, set_event_loop_thread
from dramatiq.brokers.redis import RedisBroker
from dramatiq.middleware import AgeLimit, TimeLimit, Retries, AsyncIO
from dramatiq.results.backends import RedisBackend
from dramatiq.results import Results
from loguru import logger

from app.core.config import settings
from app.dramatiq.job_tracker_middleware import JobTrackerMiddleware


async def async_startup():
    from app.db.db_manager import db_manager
    logger.info("Starting Beanie in Async Dramatiq Worker")
    await db_manager.connect()


class CustomAsyncIO(AsyncIO):
    def before_worker_boot(
            self, broker: Broker, thread: Worker, **kwargs: dict[str, Any]
    ) -> None:
        event_loop_thread = EventLoopThread(self.logger)
        event_loop_thread.start(timeout=1.0)
        set_event_loop_thread(event_loop_thread)
        event_loop_thread.run_coroutine(async_startup())


try:
    broker = RedisBroker(url=settings.dramatiq_broker_url, namespace=settings.dramatiq_namespace)
    result_backend = RedisBackend(url=settings.dramatiq_broker_url, namespace=f"{settings.dramatiq_namespace}-results")
    job_tracker = JobTrackerMiddleware(
        redis_url=settings.dramatiq_broker_url,
        namespace=settings.dramatiq_namespace,
        ttl=86400
    )
    broker.add_middleware(AgeLimit(max_age=3600000))  # 1 hour
    broker.add_middleware(TimeLimit(time_limit=600000))  # 10 minutes
    broker.add_middleware(Retries(max_retries=3))
    broker.add_middleware(CustomAsyncIO())
    broker.add_middleware(Results(backend=result_backend))
    broker.add_middleware(job_tracker)
    dramatiq.set_broker(broker)
    logger.info("Dramatiq broker configured successfully with job tracking and results backend")

except Exception as e:
    logger.error(f"Failed to setup Dramatiq broker: {e}")
    raise


def setup_dramatiq():
    return dramatiq.get_broker()
