import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'http://localhost:5003/api';

const getExpoHost = () => {
  const { manifest, manifest2, expoConfig, expoGoConfig } = Constants;

  const debuggerHost =
    expoGoConfig?.hostUri ||
    expoGoConfig?.debuggerHost ||
    manifest?.debuggerHost ||
    manifest?.hostUri ||
    manifest2?.extra?.expoGo?.debuggerHost ||
    expoConfig?.hostUri;

  if (!debuggerHost) {
    return null;
  }

  return debuggerHost.split(':')[0];
};

const applyLoopbackFallback = (url) => {
  if (!url) {
    return url;
  }

  const needsReplacement = /localhost|127\.0\.0\.1/i.test(url);
  if (!needsReplacement) {
    return url;
  }

  const lanOverrideRaw = process.env.EXPO_PUBLIC_API_BASE_URL_LAN;
  const lanOverride = lanOverrideRaw?.trim();
  if (lanOverride && lanOverride.toLowerCase() !== 'auto') {
    console.log(
      'Using EXPO_PUBLIC_API_BASE_URL_LAN override for non-localhost clients:',
      lanOverride
    );
    return lanOverride;
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    console.log(`Replacing localhost with Expo host "${expoHost}"`);
    return url.replace(/127\.0\.0\.1|localhost/gi, expoHost);
  }

  if (Platform.OS === 'android') {
    console.log('Applying Android emulator localhost alias (10.0.2.2).');
    return url.replace(/127\.0\.0\.1|localhost/gi, '10.0.2.2');
  }

  console.warn(
    'API base URL points at localhost but no LAN address could be determined. ' +
      'Set EXPO_PUBLIC_API_BASE_URL_LAN in attendeaseApp/.env when testing on a device.'
  );
  return url;
};

const resolveBaseUrl = () => {
  const lanOverrideRaw = process.env.EXPO_PUBLIC_API_BASE_URL_LAN;
  const lanOverride = lanOverrideRaw?.trim();

  const candidates = [
    lanOverride && lanOverride.toLowerCase() !== 'auto' ? lanOverride : null,
    process.env.EXPO_PUBLIC_API_BASE_URL,
    process.env.API_BASE_URL,
    process.env.EXPO_PUBLIC_BACKEND_URL,
    DEFAULT_API_BASE_URL,
  ];

  const baseCandidate = candidates.find((value) => value && value.trim());
  const selected = baseCandidate ? baseCandidate.trim() : DEFAULT_API_BASE_URL;
  const resolved = applyLoopbackFallback(selected);

  console.log('Final API Base URL:', resolved);
  return resolved;
};

const API_BASE_URL = resolveBaseUrl();

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  CITIES: '/cities',
  SUPERVISOR_WARDS: '/app/supervisor/wards',
  SUPERVISOR_SUMMARY: '/app/supervisor/wards/summary',
  EMPLOYEE_ATTENDANCE: '/app/attendance/employee',
  PUNCH_IN_OUT: '/app/attendance/employee',
  ATTENDANCE_RECORD: '/attendance',
  EMPLOYEE_DETAIL: '/app/attendance/employee/detail',
  EMPLOYEE_DETAIL_DAILY: '/app/attendance/employee/detail/daily',
  FETCH_IMAGE: '/app/attendance/employee/image',
  FACE_ATTENDANCE: '/app/attendance/employee/face-attendance',
  STORE_FACE: '/app/attendance/employee/faceRoutes/store-face',
  FACE_ENROLLMENT: '/app/attendance/employee/faceRoutes',
  FACE_GALLERY: '/app/attendance/employee/faceRoutes/gallery',
};

export const createApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;
