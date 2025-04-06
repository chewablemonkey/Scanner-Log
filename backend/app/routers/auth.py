from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from psycopg import AsyncConnection
from uuid import uuid4

from app.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
)
from app.database import get_db
from app.models import Token, User, UserCreate, UserInDB

router = APIRouter(tags=["authentication"])

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn: AsyncConnection = Depends(get_db)
):
    user = await authenticate_user(conn, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=User)
async def register_user(user: UserCreate, conn: AsyncConnection = Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM users WHERE username = %s OR email = %s",
            (user.username, user.email)
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        user_id = uuid4()
        hashed_password = get_password_hash(user.password)
        await cur.execute(
            """
            INSERT INTO users (id, email, username, hashed_password)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, username, is_active, is_admin, created_at, updated_at
            """,
            (user_id, user.email, user.username, hashed_password)
        )
        user_data = await cur.fetchone()
        await conn.commit()
        
        return User(
            id=user_data[0],
            email=user_data[1],
            username=user_data[2],
            is_active=user_data[3],
            is_admin=user_data[4],
            created_at=user_data[5],
            updated_at=user_data[6]
        )

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
