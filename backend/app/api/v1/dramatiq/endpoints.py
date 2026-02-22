from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from loguru import logger

from app.services.dramatiq.dramatiq_service import DramatiqService
from app.models.util.model import Message
from app.utills.dependencies import admin_access, CheckScope, get_dramatiq_service

dramatiq_router = APIRouter(tags=["Dramatiq Monitoring"], prefix="/dramatiq")
app_admin = Depends(admin_access)

manage_jobs = Depends(CheckScope("jobs.write"))
read_jobs = Depends(CheckScope("jobs.read"))




@dramatiq_router.get("/broker/info", dependencies=[app_admin, read_jobs])
async def get_broker_info(
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Dict[str, Any]:
    """Get broker information and statistics"""
    return await dramatiq_service.get_broker_info()


@dramatiq_router.get("/queues", dependencies=[app_admin, read_jobs])
async def get_all_queues(
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> List[str]:
    """Get list of all available queues"""
    return await dramatiq_service.get_all_queues()


@dramatiq_router.get("/queues/{queue_name}/stats", dependencies=[app_admin, read_jobs])
async def get_queue_stats(
    queue_name: str = Path(..., description="Name of the queue"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Dict[str, Any]:
    """Get statistics for a specific queue"""
    return await dramatiq_service.get_queue_stats(queue_name)


@dramatiq_router.get("/queues/{queue_name}/jobs", dependencies=[app_admin, read_jobs])
async def get_queue_jobs(
    queue_name: str = Path(..., description="Name of the queue"),
    limit: int = Query(100, description="Maximum number of jobs to return"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> List[Dict[str, Any]]:
    """Get all jobs from a specific queue"""
    jobs = await dramatiq_service.get_all_jobs(queue_name, limit)
    return [job.to_dict() for job in jobs]


@dramatiq_router.get("/jobs/all", dependencies=[app_admin, read_jobs])
async def get_all_jobs(
    queue_name: str = Query("default", description="Queue name to fetch jobs from"),
    limit: int = Query(100, description="Maximum number of jobs to return"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> List[Dict[str, Any]]:
    """Get all jobs from the specified queue (default: 'default')"""
    jobs = await dramatiq_service.get_all_jobs(queue_name, limit)
    return [job.to_dict() for job in jobs]


@dramatiq_router.get("/jobs/{message_id}", dependencies=[app_admin, read_jobs])
async def get_job_by_id(
    message_id: str = Path(..., description="Message ID of the job"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Dict[str, Any]:
    """Get a specific job by message ID"""
    job = await dramatiq_service.get_job_by_id(message_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


@dramatiq_router.post("/jobs/{message_id}/cancel", dependencies=[app_admin, manage_jobs])
async def cancel_job(
    message_id: str = Path(..., description="Message ID of the job to cancel"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Message:
    """Cancel a pending job"""
    success = await dramatiq_service.cancel_job(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
    return Message(message=f"Job {message_id} cancelled successfully")


@dramatiq_router.post("/jobs/{message_id}/retry", dependencies=[app_admin, manage_jobs])
async def retry_job(
    message_id: str = Path(..., description="Message ID of the job to retry"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Message:
    """Retry a failed job"""
    success = await dramatiq_service.retry_failed_job(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be retried")
    return Message(message=f"Job {message_id} retried successfully")


@dramatiq_router.delete("/queues/{queue_name}/clear", dependencies=[app_admin, manage_jobs])
async def clear_queue(
    queue_name: str = Path(..., description="Name of the queue to clear"),
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Message:
    """Clear all jobs from a queue"""
    cleared_count = await dramatiq_service.clear_queue(queue_name)
    return Message(message=f"Cleared {cleared_count} jobs from queue '{queue_name}'")


@dramatiq_router.get("/dashboard", dependencies=[app_admin, read_jobs])
async def get_dashboard_data(
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Dict[str, Any]:
    """Get dashboard data with overview of all queues and jobs"""
    try:
        # Get broker info
        broker_info = await dramatiq_service.get_broker_info()

        # Get all queues
        queues = await dramatiq_service.get_all_queues()

        # Get stats for each queue
        queue_stats = []
        total_stats = {
            "total_jobs": 0,
            "pending_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "running_jobs": 0
        }

        for queue_name in queues:
            stats = await dramatiq_service.get_queue_stats(queue_name)
            queue_stats.append(stats)

            # Aggregate totals
            total_stats["total_jobs"] += stats["total_jobs"]
            total_stats["pending_jobs"] += stats["pending_jobs"]
            total_stats["completed_jobs"] += stats["completed_jobs"]
            total_stats["failed_jobs"] += stats["failed_jobs"]
            total_stats["running_jobs"] += stats["running_jobs"]

        return {
            "broker_info": broker_info,
            "total_stats": total_stats,
            "queue_stats": queue_stats,
            "queues": queues
        }

    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard data")


# Health check for dramatiq monitoring
@dramatiq_router.get("/health")
async def dramatiq_health_check(
    dramatiq_service: DramatiqService = Depends(get_dramatiq_service)
) -> Dict[str, str]:
    """Health check for Dramatiq monitoring service"""
    try:
        # Try to get broker info to test connection
        await dramatiq_service.get_broker_info()
        return {"status": "healthy", "service": "dramatiq_monitoring"}
    except Exception as e:
        logger.error(f"Dramatiq health check failed: {e}")
        raise HTTPException(status_code=503, detail="Dramatiq monitoring service unhealthy")