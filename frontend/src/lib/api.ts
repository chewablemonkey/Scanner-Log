import { User, Item, Notification } from '../types';

const API_URL = 'http://localhost:8000';

export const login = async (username: string, password: string) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to login');
  }

  return response.json();
};

export const register = async (email: string, username: string, password: string) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to register');
  }

  return response.json();
};

export const getCurrentUser = async (token: string) => {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get current user');
  }

  return response.json();
};

export const getItems = async (
  token: string,
  {
    skip = 0,
    limit = 100,
    search,
    category,
    minQuantity,
    maxQuantity,
    location,
  }: {
    skip?: number;
    limit?: number;
    search?: string;
    category?: string;
    minQuantity?: number;
    maxQuantity?: number;
    location?: string;
  } = {}
) => {
  let url = `${API_URL}/items?skip=${skip}&limit=${limit}`;

  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (minQuantity !== undefined) url += `&min_quantity=${minQuantity}`;
  if (maxQuantity !== undefined) url += `&max_quantity=${maxQuantity}`;
  if (location) url += `&location=${encodeURIComponent(location)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get items');
  }

  return response.json();
};

export const getItem = async (token: string, id: string) => {
  const response = await fetch(`${API_URL}/items/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get item');
  }

  return response.json();
};

export const createItem = async (token: string, item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
  const response = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error('Failed to create item');
  }

  return response.json();
};

export const updateItem = async (token: string, id: string, item: Partial<Item>) => {
  const response = await fetch(`${API_URL}/items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error('Failed to update item');
  }

  return response.json();
};

export const deleteItem = async (token: string, id: string) => {
  const response = await fetch(`${API_URL}/items/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete item');
  }

  return true;
};

export const exportItems = async (token: string, format: 'csv' | 'json') => {
  const response = await fetch(`${API_URL}/items/export?format=${format}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export items');
  }

  return response.blob();
};

export const getNotifications = async (
  token: string,
  { skip = 0, limit = 100, unreadOnly = false }: { skip?: number; limit?: number; unreadOnly?: boolean } = {}
) => {
  let url = `${API_URL}/notifications?skip=${skip}&limit=${limit}`;
  if (unreadOnly) url += '&unread_only=true';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get notifications');
  }

  return response.json();
};

export const markNotificationRead = async (token: string, id: string) => {
  const response = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  return response.json();
};

export const markAllNotificationsRead = async (token: string) => {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }

  return true;
};
