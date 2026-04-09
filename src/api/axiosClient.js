import axios from 'axios';

// Create a custom axios instance
export const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api', // Match the backend server URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for Requests (e.g., adding Auth Tokens in future)
axiosClient.interceptors.request.use(
    (config) => {
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
            config.headers['x-session-id'] = sessionId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor for Responses (Global Error Handling)
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Example: Handle 401 Unauthorized globally
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
            localStorage.clear(); // Clear local storage too to be safe.
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
