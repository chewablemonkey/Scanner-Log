import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import psycopg
from psycopg.rows import class_row

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/scanner_log")

async def get_connection():
    """Get a connection to the database."""
    conn = await psycopg.AsyncConnection.connect(DB_URL)
    return conn

@asynccontextmanager
async def get_db() -> AsyncGenerator:
    """Get a database connection as a context manager."""
    conn = await get_connection()
    try:
        yield conn
    finally:
        await conn.close()

async def init_db():
    """Initialize the database with tables if they don't exist."""
    async with get_db() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            await cur.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                sku TEXT UNIQUE NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                min_quantity INTEGER NOT NULL DEFAULT 10,
                category TEXT,
                location TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by UUID REFERENCES users(id)
            )
            """)
            
            await cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                item_id UUID REFERENCES items(id),
                message TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
        await conn.commit()
