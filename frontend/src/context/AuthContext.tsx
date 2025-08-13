import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';
import { apiClient } from '../utils/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return { ...state, user: null };
    default:
      return state;
  }
};

const AuthContext = createContext<{
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearError: () => void;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      apiClient.setToken(token);
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const response = await apiClient.getCurrentUser();
        
        if (response.data) {
          dispatch({ type: 'SET_USER', payload: response.data });
        } else {
          localStorage.removeItem('auth_token');
          apiClient.setToken(null);
        }
      } catch (error) {
        // Token might be invalid or expired
        localStorage.removeItem('auth_token');
        apiClient.setToken(null);
        console.error('Auth initialization failed:', error);
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const response = await apiClient.login(credentials);

    if (response.data) {
      const token = response.data.access_token;
      localStorage.setItem('auth_token', token);
      apiClient.setToken(token);

      const userResponse = await apiClient.getCurrentUser();
      
      if (userResponse.data) {
        dispatch({ type: 'SET_USER', payload: userResponse.data });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: true };
      }
    }

    const errorMessage = response.error || 'Login failed';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    dispatch({ type: 'SET_LOADING', payload: false });
    return { success: false, error: errorMessage };
  };

  const register = async (userData: RegisterRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const response = await apiClient.register(userData);

    if (response.data) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true };
    }

    const errorMessage = response.error || 'Registration failed';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    dispatch({ type: 'SET_LOADING', payload: false });
    return { success: false, error: errorMessage };
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    apiClient.setToken(null);
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
