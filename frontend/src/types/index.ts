export interface User {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  category?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  itemId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
