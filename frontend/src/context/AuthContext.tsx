import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { User, LoginRequest, RegisterRequest, AuthState, AuthAction } from '../types';
import { apiClient } from '../utils/api';

// Load initial user from localStorage
const getInitialUser = (): User | null => {
  try {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
  } catch (e) {
    console.error('Failed to parse saved user info:', e);
  }
  return null;
};

const initialState: AuthState = {
  user: getInitialUser(),  // Load initial value from localStorage
  isLoading: true,  // Start with loading state
  isInitialized: false,
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
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: true, isLoading: false };
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
      
      if (!token) {
        // No token, mark as initialized and not loading
        dispatch({ type: 'SET_INITIALIZED' });
        return;
      }

      // Set token for API calls
      apiClient.setToken(token);
      
      try {
        // Try to get current user from API
        const response = await apiClient.getCurrentUser();
        
        if (response.data) {
          dispatch({ type: 'SET_USER', payload: response.data });
          // Update saved user info
          localStorage.setItem('user_info', JSON.stringify(response.data));
        } else if (response.error) {
          // Check if it's an auth error
          if (response.error?.includes('401') || response.error?.includes('403') || 
              response.error?.includes('Unauthorized') || response.error?.includes('Invalid')) {
            // Clear invalid token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            apiClient.setToken(null);
            dispatch({ type: 'SET_USER', payload: null });
          }
          // For other errors, keep the user from localStorage (already loaded in initialState)
        }
      } catch (error) {
        // Network error - keep user from localStorage
        console.error('Auth check failed (network error):', error);
      }
      
      // Mark as initialized
      dispatch({ type: 'SET_INITIALIZED' });
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
        // Save user info to localStorage
        localStorage.setItem('user_info', JSON.stringify(userResponse.data));
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
    localStorage.removeItem('user_info');
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
