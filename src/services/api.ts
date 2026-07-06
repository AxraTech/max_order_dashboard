import axios from 'axios';

const apiBaseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Create base axios instance
export const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('maxorder_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh-token')) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('maxorder_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // Try to get a new token
        const res = await axios.post(`${apiBaseURL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        
        // Save new tokens
        localStorage.setItem('maxorder_access_token', accessToken);
        localStorage.setItem('maxorder_refresh_token', newRefreshToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('maxorder_access_token');
        localStorage.removeItem('maxorder_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

