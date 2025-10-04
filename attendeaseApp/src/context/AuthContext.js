import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiService } from '../services/apiService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const [token, storedUserString] = await Promise.all([
        SecureStore.getItemAsync('authToken'),
        SecureStore.getItemAsync('authUser'),
      ]);

      console.log('Checking auth status, token exists:', !!token);

      if (!token) {
        if (storedUserString) {
          await SecureStore.deleteItemAsync('authUser');
        }
        return;
      }

      if (typeof apiService.verifyToken === 'function') {
        try {
          const response = await apiService.verifyToken();
          const responseData = response?.data ?? {};
          const verifiedUser =
            responseData.user ||
            responseData.data?.user ||
            responseData.data?.userData ||
            responseData.userData ||
            responseData;

          if (verifiedUser?.user_id) {
            setUser(verifiedUser);
            setIsAuthenticated(true);
            console.log('User authenticated via token verification:', verifiedUser);
            if (!storedUserString) {
              await SecureStore.setItemAsync('authUser', JSON.stringify(verifiedUser));
            }
            return;
          }

          console.log('Token verification succeeded but user data missing, falling back to stored profile');
        } catch (verifyError) {
          if (verifyError.response?.status === 401) {
            console.log('Token invalid during verification, clearing stored credentials');
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('authUser');
            return;
          }

          console.error('Token verification failed, using cached credentials if available:', verifyError);
        }
      }

      if (storedUserString) {
        try {
          const cachedUser = JSON.parse(storedUserString);
          setUser(cachedUser);
          setIsAuthenticated(true);
          console.log('User restored from cached profile:', cachedUser);
        } catch (parseError) {
          console.error('Failed to parse cached user profile, clearing stored data:', parseError);
          await SecureStore.deleteItemAsync('authUser');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const trimmedIdentifier = email?.trim() ?? '';
      const normalizedIdentifier =
        trimmedIdentifier.includes('@')
          ? trimmedIdentifier.toLowerCase()
          : trimmedIdentifier;
      const sanitizedPassword = typeof password === 'string' ? password : '';

      const response = await apiService.login({
        email: normalizedIdentifier,
        password: sanitizedPassword,
      });

      const data = response?.data ?? {};
      const token =
        data.token ??
        data.access_token ??
        data.data?.token ??
        data.data?.access_token ??
        null;
      const userData =
        data.user ??
        data.data?.user ??
        data.data?.userData ??
        data.userData ??
        null;
      const resolvedRole = (userData?.role ?? userData?.user_role ?? userData?.role_name ?? '')
        .toString()
        .toLowerCase();
      const isSuccess = data.success !== undefined ? data.success : !!(token && userData);

      if (isSuccess && token && userData) {
        if (resolvedRole && resolvedRole !== 'supervisor' && resolvedRole !== 'admin') {
          return {
            success: false,
            message: 'Access denied. Only supervisors and administrators can access this mobile app.'
          };
        }

        await SecureStore.setItemAsync('authToken', token);
        await SecureStore.setItemAsync('authUser', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true };
      }

      const failureMessage =
        data.error ||
        data.message ||
        'Login failed. Please check your credentials.';
      return {
        success: false,
        message: failureMessage
      };
    } catch (error) {
      const networkRelated =
        error?.isNetworkError ||
        error?.message === 'Network Error' ||
        error?.code === 'ECONNABORTED';

      if (networkRelated) {
        console.error('Login network error:', {
          message: error?.message,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
        });
      } else {
        console.error('Login error:', error);
      }

      const errorMessage = networkRelated
        ? 'Unable to reach the AttendEase server. Confirm the backend is running and that your device can access it.'
        : error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Login failed. Please check your credentials.';
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('authUser');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
