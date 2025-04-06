from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from uuid import UUID, uuid4


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: UUID = Field(default_factory=uuid4)
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    sku: str
    quantity: int = 0
    min_quantity: int = 10  # Threshold for low inventory notification
    category: Optional[str] = None
    location: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: UUID

    class Config:
        from_attributes = True


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    category: Optional[str] = None
    location: Optional[str] = None


class Notification(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    item_id: UUID
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: UUID
    item_id: UUID
    message: str
