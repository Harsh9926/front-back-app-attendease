const DEFAULT_API_BASE_URL = 'http://localhost:5003/api';

const resolveBaseUrl = () => {
  const envUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL;

  if (envUrl) {
    console.log('Using API URL from env:', envUrl);
    return envUrl;
  }

  console.warn('Falling back to default API URL:', DEFAULT_API_BASE_URL);
  return DEFAULT_API_BASE_URL;
};

const API_BASE_URL = resolveBaseUrl();

console.log('Final API Base URL:', API_BASE_URL);

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  CITIES: '/cities',
  SUPERVISOR_WARDS: '/app/supervisor/wards',
  EMPLOYEE_ATTENDANCE: '/app/attendance/employee',
  PUNCH_IN_OUT: '/app/attendance/employee',
  ATTENDANCE_RECORD: '/attendance',
  EMPLOYEE_DETAIL: '/app/attendance/employee/detail',
  FETCH_IMAGE: '/app/attendance/employee/image',
  FACE_ATTENDANCE: '/app/attendance/employee/face-attendance',
  STORE_FACE: '/app/attendance/employee/faceRoutes/store-face',
};

export const createApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
