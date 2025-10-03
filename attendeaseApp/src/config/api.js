// Public API Configuration - No local backend required
const PUBLIC_API_BASE_URL = 'http://13.202.210.74:5002/api';

const resolveDefaultBaseUrl = () => {
  // Always use public API for production
  console.log('Using public API URL:', PUBLIC_API_BASE_URL);
  return PUBLIC_API_BASE_URL;
};

// API Configuration
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  resolveDefaultBaseUrl();

console.log('Final API Base URL:', API_BASE_URL);

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 10000,
};

// API Endpoints - Final API structure as per backend documentation
export const API_ENDPOINTS = {
  // 🔑 Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',

  // 📍 Master Data
  CITIES: '/cities',

  // 👨‍💼 Supervisor
  SUPERVISOR_WARDS: '/app/supervisor/wards',

  // 👷 Employee Attendance
  EMPLOYEE_ATTENDANCE: '/app/attendance/employee',
  PUNCH_IN_OUT: '/app/attendance/employee',
  ATTENDANCE_RECORD: '/attendance',
  EMPLOYEE_DETAIL: '/app/attendance/employee/detail',
  FETCH_IMAGE: '/app/attendance/employee/image',

  // 🖼 Face Recognition
  FACE_ATTENDANCE: '/app/attendance/employee/face-attendance',
  STORE_FACE: '/app/attendance/employee/faceRoutes/store-face',
};

// Helper function to create full API URLs
export const createApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
