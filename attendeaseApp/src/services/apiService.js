import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, API_ENDPOINTS, createApiUrl } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('API Request:', config.method?.toUpperCase(), config.url, 'with token');
      } else {
        console.log('API Request:', config.method?.toUpperCase(), config.url, 'NO TOKEN');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const { message, code, config } = error ?? {};
    const status = error?.response?.status ?? 'NETWORK_ERROR';
    const payload = error?.response?.data ?? { message };
    const requestUrl = config?.url ?? 'unknown-url';

    if (!error.response) {
      console.error('API Network Error:', { status, code, message, url: requestUrl, baseURL: config?.baseURL });
      error.isNetworkError = true;
    } else {
      console.error('API Error:', status, payload, 'for', requestUrl);
    }

    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('401 error, removing token');
      await SecureStore.deleteItemAsync('authToken');
    }
    return Promise.reject(error);
  }
);

// API Service methods - Final API integration as per backend documentation
export const apiService = {
  // 🔑 Authentication
  login: (credentials) => api.post(API_ENDPOINTS.LOGIN, credentials),
  logout: () => api.post(API_ENDPOINTS.LOGOUT),

  // 📍 Master Data
  getCities: () => api.get(API_ENDPOINTS.CITIES),

  // 👨‍💼 Supervisor
  getSupervisorWards: (userId) => api.post(API_ENDPOINTS.SUPERVISOR_WARDS, { user_id: userId }),

  // Get supervisor employees (wards with employee data)
  // Resolve the supervisor ID from the caller or cached auth data to satisfy backend requirements
  getSupervisorEmployees: async (userId, options = {}) => {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      try {
        const storedUserString = await SecureStore.getItemAsync('authUser');
        if (storedUserString) {
          const storedUser = JSON.parse(storedUserString);
          resolvedUserId = storedUser?.user_id ?? storedUser?.id ?? storedUser?.userId ?? null;
        }
      } catch (storageError) {
        console.warn('getSupervisorEmployees: failed to resolve user ID from storage', storageError);
      }
    }

    const requestBody = resolvedUserId ? { user_id: resolvedUserId } : {};

    if (options.startDate) {
      requestBody.startDate = options.startDate;
    }

    if (options.endDate) {
      requestBody.endDate = options.endDate;
    }
    const response = await api.post(API_ENDPOINTS.SUPERVISOR_WARDS, requestBody);
    const payload = response?.data;
    const normalizedData = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.wards)
          ? payload.wards
          : Array.isArray(payload?.employees)
            ? payload.employees
            : [];

    const successFlag =
      payload?.success !== undefined
        ? !!payload.success
        : Array.isArray(payload)
          ? true
          : normalizedData.length > 0;

    const message = payload?.message || payload?.error || null;

    return {
      success: successFlag,
      data: normalizedData,
      message,
      raw: payload,
    };
  },

  getSupervisorSummary: async (options = {}) => {
    const normalizeSummary = (value) => {
      if (!value || typeof value !== 'object') {
        return null;
      }

      const coerceNumber = (input, fallback = 0) => {
        const numeric = Number(input);
        return Number.isFinite(numeric) ? numeric : fallback;
      };

      const totalEmployees = coerceNumber(
        value.totalEmployees ??
          value.total_employees ??
          value.total ??
          value.totalCount
      );
      const inProgress = coerceNumber(
        value.inProgress ??
          value.presentToday ??
          value.present ??
          value.in_progress ??
          value.inProgressCount
      );
      const marked = coerceNumber(
        value.marked ??
          value.markedCount ??
          value.marked_count ??
          value.completed ??
          value.completedCount
      );
      const notMarked = coerceNumber(
        value.notMarked ??
          value.not_marked ??
          value.absent ??
          value.pending ??
          value.pendingCount
      );
      const attendanceRate = coerceNumber(
        value.attendanceRate ?? value.attendance_rate
      );

      return {
        totalEmployees,
        inProgress,
        marked,
        notMarked,
        attendanceRate,
      };
    };

    const extractSummary = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      const candidate =
        (!Array.isArray(payload.data) && typeof payload.data === 'object'
          ? payload.data
          : null) ||
        (!Array.isArray(payload.summary) && typeof payload.summary === 'object'
          ? payload.summary
          : null) ||
        (payload.success === undefined && !Array.isArray(payload)
          ? payload
          : null);

      return normalizeSummary(candidate);
    };

    const startDate = options.startDate;
    const endDate = options.endDate;

    const params = {};
    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }

    try {
      const response = await api.get(API_ENDPOINTS.SUPERVISOR_SUMMARY, {
        params,
      });
      const payload = response?.data ?? {};
      const data = extractSummary(payload);

      const successFlag =
        payload?.success !== undefined ? !!payload.success : !!data;
      const message = payload?.message || payload?.error || null;

      return {
        success: successFlag,
        data,
        message,
        raw: payload,
      };
    } catch (getError) {
      if (!options.userId) {
        throw getError;
      }

      try {
        const requestBody = {
          user_id: options.userId,
        };
        if (startDate) {
          requestBody.startDate = startDate;
        }
        if (endDate) {
          requestBody.endDate = endDate;
        }

        const response = await api.post(
          API_ENDPOINTS.SUPERVISOR_SUMMARY,
          requestBody
        );
        const payload = response?.data ?? {};
        const data = extractSummary(payload);

        const successFlag =
          payload?.success !== undefined ? !!payload.success : !!data;
        const message = payload?.message || payload?.error || null;

        return {
          success: successFlag,
          data,
          message,
          raw: payload,
        };
      } catch (postError) {
        throw postError;
      }
    }
  },

  // 👷 Employee Attendance
  getEmployeeAttendance: (empId, wardId, date) =>
    api.post(API_ENDPOINTS.EMPLOYEE_ATTENDANCE, {
      emp_id: empId,
      ward_id: wardId,
      date: date
    }),

  punchInOut: (attendanceData) => api.put(API_ENDPOINTS.PUNCH_IN_OUT, attendanceData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  getEmployeeDailyAttendance: async (employeeId, options = {}) => {
    if (!employeeId) {
      throw new Error('getEmployeeDailyAttendance: employeeId is required');
    }

    const params = {
      empId: employeeId,
    };

    if (options.startDate) {
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      params.endDate = options.endDate;
    }

    try {
      const response = await api.get(API_ENDPOINTS.EMPLOYEE_DETAIL_DAILY, {
        params,
      });
      const payload = response?.data ?? null;

      if (payload?.success === false) {
        return {
          success: false,
          data: payload?.data ?? null,
          message:
            payload?.error ??
            payload?.message ??
            'Unable to fetch attendance details.',
          raw: payload,
        };
      }

      const data =
        payload?.data ??
        (payload?.records
          ? { records: payload.records, stats: payload.stats, range: payload.range }
          : payload);

      return {
        success: true,
        data,
        message: payload?.message ?? null,
        raw: payload,
      };
    } catch (error) {
      console.error('getEmployeeDailyAttendance error:', error);
      throw error;
    }
  },

  getAttendanceRecord: (data) => api.post(API_ENDPOINTS.ATTENDANCE_RECORD, data),

  getEmployeeDetail: (empId, month) => api.get(API_ENDPOINTS.EMPLOYEE_DETAIL, {
    params: { empId, month }
  }),

  fetchImage: (attendanceId, punchType) => api.get(API_ENDPOINTS.FETCH_IMAGE, {
    params: { attendance_id: attendanceId, punch_type: punchType }
  }),

  // 🖼 Face Recognition
  faceAttendance: (formData) => api.post(API_ENDPOINTS.FACE_ATTENDANCE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  storeFace: async (formData) => {
    const endpoint = API_ENDPOINTS.STORE_FACE;
    try {
      const axiosResponse = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Pretty-print the key fields we care about for face storage
      try {
        const payload = axiosResponse?.data ?? {};
        const logPayload = {
          success: payload?.success ?? true,
          faceId: payload?.faceId ?? payload?.data?.faceId ?? null,
          imageUrl: payload?.imageUrl ?? payload?.data?.imageUrl ?? null,
          confidence: payload?.confidence ?? payload?.data?.confidence ?? null,
        };
        console.log(JSON.stringify(logPayload, null, 2));
      } catch (logErr) {
        // ignore logging errors
      }
      return axiosResponse;
    } catch (error) {
      const isNetworkError = !error.response && error.message?.includes('Network Error');

      if (!isNetworkError) {
        throw error;
      }

      // Attempt a manual fetch fallback to the same endpoint when axios cannot reach it
      try {
        const url = createApiUrl(endpoint);
        const token = await SecureStore.getItemAsync('authToken');

        // Clone the FormData because the original instance might be locked after the first request
        const fallbackFormData = new FormData();
        if (Array.isArray(formData?._parts)) {
          formData._parts.forEach(([key, value]) => {
            fallbackFormData.append(key, value);
          });
        } else {
          const cloningError = new Error('Unable to retry face upload because form data is not cloneable.');
          cloningError.response = { data: { message: cloningError.message } };
          throw cloningError;
        }

        console.warn('storeFace: axios network error, retrying with fetch', url);
        const response = await fetch(url, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fallbackFormData,
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Fallback request failed (${response.status}): ${responseText}`);
        }

        const data = await response.json();
        // Pretty-print the key fields we care about for face storage (fallback path)
        try {
          const logPayload = {
            success: data?.success ?? true,
            faceId: data?.faceId ?? data?.data?.faceId ?? null,
            imageUrl: data?.imageUrl ?? data?.data?.imageUrl ?? null,
            confidence: data?.confidence ?? data?.data?.confidence ?? null,
          };
          console.log(JSON.stringify(logPayload, null, 2));
        } catch (logErr) {
          // ignore logging errors
        }
        return { data };
      } catch (fallbackError) {
        console.error('storeFace: fallback upload failed', fallbackError);
        if (!fallbackError.response) {
          fallbackError.response = { data: { message: fallbackError.message || 'Face upload failed' } };
        }
        throw fallbackError;
      }
    }
  },

  getFaceEnrollment: (empId) => api.get(`${API_ENDPOINTS.FACE_ENROLLMENT}/${empId}`),

  deleteFaceEnrollment: (empId) => api.delete(`${API_ENDPOINTS.FACE_ENROLLMENT}/${empId}`),

  getFaceGallery: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.FACE_GALLERY, { params });
    const payload = response?.data;
    const images = Array.isArray(payload?.images)
      ? payload.images
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    const successFlag =
      payload?.success !== undefined
        ? !!payload.success
        : images.length > 0;

    return {
      success: successFlag,
      data: images,
      bucket: payload?.bucket ?? null,
      prefix: payload?.prefix ?? null,
      raw: payload,
    };
  },

  // Generic API methods
  get: (endpoint, config) => api.get(endpoint, config),
  post: (endpoint, data, config) => api.post(endpoint, data, config),
  put: (endpoint, data, config) => api.put(endpoint, data, config),
  delete: (endpoint, config) => api.delete(endpoint, config),
};

export default api;
