from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection
from typing import List
from uuid import UUID

from app.auth import get_current_active_user
from app.database import get_db
from app.models import Notification, User

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(get_current_active_user)],
)

@router.get("/", response_model=List[Notification])
async def read_notifications(
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = "SELECT * FROM notifications WHERE user_id = %s"
    params = [current_user.id]
    
    if unread_only:
        query += " AND is_read = FALSE"
    
    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, skip])
    
    async with conn.cursor() as cur:
        await cur.execute(query, params)
        notifications_data = await cur.fetchall()
        
        notifications = []
        for notification_data in notifications_data:
            notifications.append(Notification(
                id=notification_data[0],
                user_id=notification_data[1],
                item_id=notification_data[2],
                message=notification_data[3],
                is_read=notification_data[4],
                created_at=notification_data[5]
            ))
        
        return notifications

@router.put("/{notification_id}/read", response_model=Notification)
async def mark_notification_read(
    notification_id: UUID,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM notifications WHERE id = %s AND user_id = %s",
            (notification_id, current_user.id)
        )
        notification_data = await cur.fetchone()
        
        if not notification_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        await cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s RETURNING *",
            (notification_id,)
        )
        updated_notification = await cur.fetchone()
        await conn.commit()
        
        return Notification(
            id=updated_notification[0],
            user_id=updated_notification[1],
            item_id=updated_notification[2],
            message=updated_notification[3],
            is_read=updated_notification[4],
            created_at=updated_notification[5]
        )

@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
            (current_user.id,)
        )
        await conn.commit()
