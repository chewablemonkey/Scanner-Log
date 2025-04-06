from fastapi import APIRouter, Depends, HTTPException, status, Query
from psycopg import AsyncConnection
from typing import List, Optional
from uuid import UUID, uuid4
import csv
import io
from fastapi.responses import StreamingResponse

from app.auth import get_current_active_user
from app.database import get_db
from app.models import Item, ItemCreate, ItemUpdate, User

router = APIRouter(
    prefix="/items",
    tags=["items"],
    dependencies=[Depends(get_current_active_user)],
)

@router.post("/", response_model=Item)
async def create_item(
    item: ItemCreate,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    item_id = uuid4()
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO items (id, name, description, sku, quantity, min_quantity, category, location, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, description, sku, quantity, min_quantity, category, location, created_at, updated_at, created_by
            """,
            (
                item_id, item.name, item.description, item.sku, item.quantity,
                item.min_quantity, item.category, item.location, current_user.id
            )
        )
        item_data = await cur.fetchone()
        await conn.commit()
        
        if item.quantity <= item.min_quantity:
            await cur.execute(
                """
                INSERT INTO notifications (id, user_id, item_id, message)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    uuid4(), current_user.id, item_id,
                    f"Low inventory alert: {item.name} (SKU: {item.sku}) is below minimum quantity."
                )
            )
            await conn.commit()
        
        return Item(
            id=item_data[0],
            name=item_data[1],
            description=item_data[2],
            sku=item_data[3],
            quantity=item_data[4],
            min_quantity=item_data[5],
            category=item_data[6],
            location=item_data[7],
            created_at=item_data[8],
            updated_at=item_data[9],
            created_by=item_data[10]
        )

@router.get("/", response_model=List[Item])
async def read_items(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_quantity: Optional[int] = None,
    max_quantity: Optional[int] = None,
    location: Optional[str] = None,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = "SELECT * FROM items WHERE 1=1"
    params = []
    
    if search:
        query += " AND (name ILIKE %s OR description ILIKE %s OR sku ILIKE %s)"
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])
    
    if category:
        query += " AND category = %s"
        params.append(category)
    
    if min_quantity is not None:
        query += " AND quantity >= %s"
        params.append(min_quantity)
    
    if max_quantity is not None:
        query += " AND quantity <= %s"
        params.append(max_quantity)
    
    if location:
        query += " AND location = %s"
        params.append(location)
    
    query += " ORDER BY name LIMIT %s OFFSET %s"
    params.extend([limit, skip])
    
    async with conn.cursor() as cur:
        await cur.execute(query, params)
        items_data = await cur.fetchall()
        
        items = []
        for item_data in items_data:
            items.append(Item(
                id=item_data[0],
                name=item_data[1],
                description=item_data[2],
                sku=item_data[3],
                quantity=item_data[4],
                min_quantity=item_data[5],
                category=item_data[6],
                location=item_data[7],
                created_at=item_data[8],
                updated_at=item_data[9],
                created_by=item_data[10]
            ))
        
        return items

@router.get("/export", response_class=StreamingResponse)
async def export_items(
    format: str = Query(..., regex="^(csv|json)$"),
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM items ORDER BY name")
        items_data = await cur.fetchall()
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow([
                "ID", "Name", "Description", "SKU", "Quantity", 
                "Min Quantity", "Category", "Location", "Created At", 
                "Updated At", "Created By"
            ])
            
            for item in items_data:
                writer.writerow(item)
            
            output.seek(0)
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=items.csv"}
            )
        else:  # JSON format
            items = []
            for item_data in items_data:
                items.append({
                    "id": str(item_data[0]),
                    "name": item_data[1],
                    "description": item_data[2],
                    "sku": item_data[3],
                    "quantity": item_data[4],
                    "min_quantity": item_data[5],
                    "category": item_data[6],
                    "location": item_data[7],
                    "created_at": item_data[8].isoformat() if item_data[8] else None,
                    "updated_at": item_data[9].isoformat() if item_data[9] else None,
                    "created_by": str(item_data[10])
                })
            
            return StreamingResponse(
                iter([str(items).encode()]),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=items.json"}
            )

@router.get("/{item_id}", response_model=Item)
async def read_item(
    item_id: UUID,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
        item_data = await cur.fetchone()
        
        if not item_data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return Item(
            id=item_data[0],
            name=item_data[1],
            description=item_data[2],
            sku=item_data[3],
            quantity=item_data[4],
            min_quantity=item_data[5],
            category=item_data[6],
            location=item_data[7],
            created_at=item_data[8],
            updated_at=item_data[9],
            created_by=item_data[10]
        )

@router.put("/{item_id}", response_model=Item)
async def update_item(
    item_id: UUID,
    item_update: ItemUpdate,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
        existing_item = await cur.fetchone()
        
        if not existing_item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        update_fields = []
        params = []
        
        for field, value in item_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        if not update_fields:
            return Item(
                id=existing_item[0],
                name=existing_item[1],
                description=existing_item[2],
                sku=existing_item[3],
                quantity=existing_item[4],
                min_quantity=existing_item[5],
                category=existing_item[6],
                location=existing_item[7],
                created_at=existing_item[8],
                updated_at=existing_item[9],
                created_by=existing_item[10]
            )
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        query = f"UPDATE items SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
        params.append(item_id)
        
        await cur.execute(query, params)
        updated_item = await cur.fetchone()
        await conn.commit()
        
        new_quantity = item_update.quantity if item_update.quantity is not None else existing_item[4]
        min_quantity = item_update.min_quantity if item_update.min_quantity is not None else existing_item[5]
        
        if new_quantity <= min_quantity:
            item_name = item_update.name if item_update.name is not None else existing_item[1]
            item_sku = item_update.sku if item_update.sku is not None else existing_item[3]
            
            await cur.execute(
                """
                INSERT INTO notifications (id, user_id, item_id, message)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    uuid4(), current_user.id, item_id,
                    f"Low inventory alert: {item_name} (SKU: {item_sku}) is below minimum quantity."
                )
            )
            await conn.commit()
        
        return Item(
            id=updated_item[0],
            name=updated_item[1],
            description=updated_item[2],
            sku=updated_item[3],
            quantity=updated_item[4],
            min_quantity=updated_item[5],
            category=updated_item[6],
            location=updated_item[7],
            created_at=updated_item[8],
            updated_at=updated_item[9],
            created_by=updated_item[10]
        )

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    conn: AsyncConnection = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Item not found")
        
        await cur.execute("DELETE FROM notifications WHERE item_id = %s", (item_id,))
        
        await cur.execute("DELETE FROM items WHERE id = %s", (item_id,))
        await conn.commit()
