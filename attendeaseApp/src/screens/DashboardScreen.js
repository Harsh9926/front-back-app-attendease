import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { Camera as CameraModule, CameraView } from 'expo-camera';
import attendanceService from '../services/attendanceService';
import DateTimePicker from '@react-native-community/datetimepicker';

const normalizeDate = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  date.setHours(0, 0, 0, 0);
  return date;
};

const toISODate = (value) => {
  const date = normalizeDate(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  const offsetMinutes = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
};

const formatDateDisplay = (value) => {
  try {
    return normalizeDate(value).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (_error) {
    return '';
  }
};

const DashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    markedCount: 0,
    totalWards: 0,
    absentCount: 0,
  });
  const [wardEmployees, setWardEmployees] = useState([]);
  const [expandedAttendanceWards, setExpandedAttendanceWards] = useState(new Set());
  const [punchingMap, setPunchingMap] = useState({});
  const [faceEnrollmentMap, setFaceEnrollmentMap] = useState({});
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('back');
  const cameraRef = useRef(null);
  const [pendingCapture, setPendingCapture] = useState(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = normalizeDate(new Date());
    return { start: today, end: today };
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const isTablet = width >= 600 && width < 900;
  const isDesktop = width >= 900;
  const resolveAttendanceId = useCallback(async (ward, employee, dateOverride) => {
    const directId =
      employee?.attendance_id ??
      employee?.attendanceId ??
      employee?.attendance?.attendance_id ??
      employee?.attendance?.id ??
      employee?.current_attendance_id ??
      employee?.currentAttendanceId ??
      null;

    if (directId) {
      return directId;
    }

    try {
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const currentDate = dateOverride || new Date().toISOString().split('T')[0];
      const payload = {
        emp_id: employee?.emp_id,
        ward_id: ward?.ward_id,
        date: currentDate,
      };

      if (supervisorId) {
        payload.user_id = supervisorId;
      }

      const response = await apiService.getEmployeeAttendance(
        payload.emp_id,
        payload.ward_id,
        payload.date
      );

      const responseData = response?.data;
      if (!responseData) {
        return null;
      }

      const attendanceRecord = Array.isArray(responseData)
        ? responseData[0]
        : responseData?.attendance ??
          responseData?.data ??
          responseData;

      return (
        attendanceRecord?.attendance_id ??
        attendanceRecord?.attendanceId ??
        attendanceRecord?.id ??
        null
      );
    } catch (error) {
      console.warn('resolveAttendanceId: fallback request failed', error);
      return null;
    }
  }, [user]);

  const resolveEmployeeUserId = useCallback((employee) => {
    const resolvedUserId = (
      employee?.user_id ??
      employee?.userId ??
      employee?.user?.id ??
      employee?.user?.user_id ??
      employee?.user?.userId ??
      employee?.employee_user_id ??
      employee?.employeeUserId ??
      employee?.user_auth_id ??
      employee?.userAuthId ??
      null
    );

    if (resolvedUserId !== null && resolvedUserId !== undefined) {
      return resolvedUserId;
    }

    const fallbackEmployeeId =
      employee?.emp_id ??
      employee?.empId ??
      employee?.employee_id ??
      employee?.employeeId ??
      employee?.id ??
      null;

    if (fallbackEmployeeId !== null && fallbackEmployeeId !== undefined) {
      console.warn('resolveEmployeeUserId: falling back to employee ID for userId', fallbackEmployeeId);
      return fallbackEmployeeId;
    }

    return null;
  }, []);

  const markEmployeeFaceEnrollment = useCallback((wardId, employeeId, faceData = {}) => {
    if (!wardId || !employeeId) {
      return;
    }

    setWardEmployees(prevWards => prevWards.map(ward => {
      if (ward?.ward_id !== wardId) {
        return ward;
      }

      const updatedEmployees = (ward.employees || []).map(emp => {
        const currentId = emp?.emp_id ?? emp?.empId ?? emp?.id;
        if (currentId?.toString() !== employeeId.toString()) {
          return emp;
        }

        return {
          ...emp,
          face_verified: true,
          face_enrolled: true,
          face_registered: true,
          faceRegistered: true,
          face_image_url: faceData.imageUrl ?? emp?.face_image_url ?? emp?.faceImageUrl ?? null,
          faceImageUrl: faceData.imageUrl ?? emp?.faceImageUrl ?? emp?.face_image_url ?? null,
          faceEnrollmentUrl: faceData.imageUrl ?? emp?.faceEnrollmentUrl ?? null,
        };
      });

      return {
        ...ward,
        employees: updatedEmployees,
      };
    }));
  }, []);

  const clearEmployeeFaceEnrollment = useCallback((wardId, employeeId) => {
    if (!wardId || !employeeId) {
      return;
    }

    setWardEmployees(prevWards => prevWards.map(ward => {
      if (ward?.ward_id !== wardId) {
        return ward;
      }

      const updatedEmployees = (ward.employees || []).map(emp => {
        const currentId = emp?.emp_id ?? emp?.empId ?? emp?.id;
        if (currentId?.toString() !== employeeId.toString()) {
          return emp;
        }

        return {
          ...emp,
          face_verified: false,
          face_enrolled: false,
          face_registered: false,
          faceRegistered: false,
          face_image_url: null,
          faceImageUrl: null,
          faceEnrollmentUrl: null,
        };
      });

      return {
        ...ward,
        employees: updatedEmployees,
      };
    }));
  }, []);

  const toggleFaceEnrollmentLoading = useCallback((key, isLoading) => {
    if (!key) {
      return;
    }

    setFaceEnrollmentMap(prev => {
      if (isLoading) {
        if (prev[key]) {
          return prev;
        }
        return { ...prev, [key]: true };
      }

      if (!prev[key]) {
        return prev;
      }

      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const resetDateRange = useCallback(() => {
    const today = normalizeDate(new Date());
    setDateRange({ start: today, end: today });
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, []);

  const handleStartDateChange = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    const eventType = event?.type || 'set';

    if (eventType === 'dismissed') {
      return;
    }

    setDateRange(prev => {
      const nextStart = normalizeDate(selectedDate ?? prev.start);
      const adjustedEnd = nextStart > prev.end ? nextStart : prev.end;
      return { start: nextStart, end: adjustedEnd };
    });

    if (Platform.OS === 'ios') {
      setShowStartPicker(false);
    }
  }, []);

  const handleEndDateChange = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    setDateRange(prev => {
      const nextEnd = normalizeDate(selectedDate ?? prev.end);
      const adjustedStart = nextEnd < prev.start ? nextEnd : prev.start;
      return { start: adjustedStart, end: nextEnd };
    });

    if (Platform.OS === 'ios') {
      setShowEndPicker(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      console.log('Fetching dashboard stats...');
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;

      if (!supervisorId) {
        console.warn('Cannot fetch dashboard stats: missing supervisor ID');
        return;
      }

      const startDate = toISODate(dateRange.start);
      const endDate = toISODate(dateRange.end);

      const [summaryResult, employeesResult] = await Promise.all([
        apiService
          .getSupervisorSummary({ userId: supervisorId, startDate, endDate })
          .catch((error) => {
            console.error('Supervisor summary error:', error);
            return { success: false, data: null, error };
          }),
        apiService
          .getSupervisorEmployees(supervisorId, { startDate, endDate })
          .catch((error) => {
            console.error('Supervisor employees error:', error);
            return { success: false, data: [], message: error?.message, error };
          }),
      ]);

      const wardsData = employeesResult?.success ? employeesResult.data || [] : [];

      let computedTotalEmployees = 0;
      let computedPresent = 0;
      let computedMarked = 0;
      let computedAbsent = 0;

      wardsData.forEach((ward) => {
        const employees = ward.employees || [];
        computedTotalEmployees += employees.length;
        employees.forEach((emp) => {
          const status = (emp?.attendance_status || '').toString().trim().toLowerCase();
          switch (status) {
            case 'present':
            case 'in progress':
            case 'in-progress':
            case 'inprogress':
              computedPresent += 1;
              break;
            case 'marked':
              computedMarked += 1;
              break;
            case 'not marked':
            case 'not-marked':
            case 'notmarked':
            case 'absent':
              computedAbsent += 1;
              break;
            default:
              if (status) {
                console.warn('fetchDashboardStats: unhandled attendance status', status);
              }
              break;
          }
        });
      });

      if (computedAbsent === 0) {
        computedAbsent = Math.max(
          computedTotalEmployees - (computedPresent + computedMarked),
          0
        );
      }

      const summaryData =
        summaryResult?.success && summaryResult.data ? summaryResult.data : null;

      const resolveNumber = (value, fallback = 0) =>
        typeof value === 'number' && Number.isFinite(value) ? value : fallback;

      const totalEmployees = resolveNumber(
        summaryData?.totalEmployees,
        computedTotalEmployees
      );
      const presentToday = resolveNumber(summaryData?.inProgress, computedPresent);
      const markedCount = resolveNumber(summaryData?.marked, computedMarked);

      const absentCount = resolveNumber(
        summaryData?.notMarked,
        Math.max(
          totalEmployees - (presentToday + markedCount),
          computedAbsent
        )
      );

      setStats({
        totalEmployees,
        presentToday,
        markedCount,
        totalWards: wardsData.length,
        absentCount,
      });

      setWardEmployees(wardsData);

      console.log('Stats updated:', {
        totalEmployees,
        present: presentToday,
        marked: markedCount,
        absent: absentCount,
        totalWards: wardsData.length,
      });

      if (!employeesResult?.success && employeesResult?.message) {
        Alert.alert('Dashboard', employeesResult.message);
      } else if (!summaryResult?.success && summaryResult?.message) {
        Alert.alert('Dashboard', summaryResult.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Dashboard error details:', error.response?.data);
    }
  }, [user?.user_id, user?.id, user?.userId, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const navigateToEmployees = () => {
    navigation.navigate('Employees');
  };

  const navigateToReports = () => {
    navigation.navigate('AttendanceReports');
  };

  const navigateToTodayAttendance = () => {
    navigation.navigate('TodayAttendance');
  };

  const navigateToNotifications = () => {
    navigation.navigate('Notifications');
  };

  const navigateToFaceGallery = () => {
    navigation.navigate('FaceGallery');
  };

  const navigateToAttendanceImages = () => {
    navigation.navigate('AttendanceImages');
  };

  const handleEmployeeSearch = () => {
    Alert.alert(
      'Employee Search',
      'This feature allows you to quickly find employees across all your wards.'
    );
  };

  const handleWardOverview = () => {
    Alert.alert(
      'Ward Overview',
      'View detailed information about each ward under your supervision.'
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export attendance data to Excel or PDF format for reporting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export Excel', onPress: () => console.log('Exporting Excel...') },
        { text: 'Export PDF', onPress: () => console.log('Exporting PDF...') },
      ]
    );
  };

  const handleEmergencyContacts = () => {
    Alert.alert(
      'Emergency Contacts',
      'Admin: +91 98765 43210\nHR Department: +91 98765 43211\nIT Support: +91 98765 43212'
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve the app. Please contact support@attendease.com'
    );
  };

  const toggleAttendanceWard = (wardId) => {
    setExpandedAttendanceWards(prev => {
      const next = new Set(prev);
      if (next.has(wardId)) {
        next.delete(wardId);
      } else {
        next.add(wardId);
      }
      return next;
    });
  };

const ensureCameraPermission = async () => {
  if (cameraPermission === 'granted') {
    return true;
  }
  const { status } = await CameraModule.requestCameraPermissionsAsync();
    setCameraPermission(status);
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Camera permission is required to capture attendance photos.');
      return false;
    }
  return true;
};

  const parsePunchTime = useCallback((value) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const ms = value >= 1e12 ? value : value * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }, []);

  const IST_OFFSET_MINUTES = 330;

  const formatPunchDisplay = useCallback((date) => {
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }

    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const formatter = new Intl.DateTimeFormat('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });
        return formatter.format(date);
      }
    } catch (error) {
      // fall back to manual conversion below
    }

    const istMillis = date.getTime() + IST_OFFSET_MINUTES * 60 * 1000;
    const istDate = new Date(istMillis);
    const hours24 = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();

    const suffix = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = ((hours24 + 11) % 12) + 1;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedHours = hours12.toString().padStart(2, '0');

    return `${paddedHours}:${paddedMinutes} ${suffix}`;
  }, []);

  const getEmployeePunchTimes = useCallback((employee) => {
    if (!employee) {
      return {
        punchIn: null,
        punchOut: null,
        lastPunch: null,
        punchInDisplay: null,
        punchOutDisplay: null,
      };
    }

    const punchIn =
      parsePunchTime(employee.punch_in_epoch) ??
      parsePunchTime(employee.punch_in_time);

    const punchOut =
      parsePunchTime(employee.punch_out_epoch) ??
      parsePunchTime(employee.punch_out_time);

    const lastPunch =
      parsePunchTime(employee.last_punch_epoch) ??
      parsePunchTime(employee.last_punch_time) ??
      punchOut ??
      punchIn ??
      null;

    const stringOrNull = (value) =>
      typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : null;

    const punchInDisplay =
      stringOrNull(employee.punch_in_display) ??
      formatPunchDisplay(
        punchIn && Number.isNaN(punchIn.getTime()) ? null : punchIn
      );

    const punchOutDisplay =
      stringOrNull(employee.punch_out_display) ??
      formatPunchDisplay(
        punchOut && Number.isNaN(punchOut.getTime()) ? null : punchOut
      );

    return {
      punchIn,
      punchOut,
      lastPunch,
      punchInDisplay,
      punchOutDisplay,
    };
  }, [parsePunchTime, formatPunchDisplay]);

  const openPunchCapture = async (ward, employee, punchType) => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) return;

    setPendingCapture({ mode: 'attendance', ward, employee, punchType });
    setCapturedPhotoUri(null);
    setCameraFacing('back');
    setCameraVisible(true);
  };

  const openFaceEnrollmentCapture = async (ward, employee) => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) return;

    setPendingCapture({ mode: 'storeFace', ward, employee });
    setCapturedPhotoUri(null);
    setCameraFacing('back');
    setCameraVisible(true);
  };

  const handleCapturePhoto = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
        setCapturedPhotoUri(photo.uri);
      }
    } catch (error) {
      console.error('Photo capture failed:', error);
      Alert.alert('Camera', 'Could not capture the photo. Please try again.');
    }
  };

  const resetCameraState = () => {
    setCameraVisible(false);
    setCapturedPhotoUri(null);
    setPendingCapture(null);
    setCameraFacing('back');
  };

  const submitCapturedPhoto = async () => {
    if (!pendingCapture?.employee) {
      Alert.alert('Face Capture', 'Missing employee details. Please try again.');
      return;
    }

    if (!capturedPhotoUri) {
      Alert.alert('Face Capture', 'Please capture a photo before submitting.');
      return;
    }

    const { ward, employee, punchType, mode } = pendingCapture;
    const employeeUserId = resolveEmployeeUserId(employee);
    const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;

    if (!employeeUserId) {
      Alert.alert('Face Capture', 'Unable to determine the employee user ID.');
      return;
    }

    const wardId = ward?.ward_id;
    const employeeId = employee?.emp_id ?? employee?.empId ?? employee?.id;
    const enrollmentKey = `${wardId ?? 'global'}-${employeeId ?? employeeUserId}`;
    const timestamp = Date.now();
    const buildImageFile = (suffix) => ({
      uri: capturedPhotoUri,
      name: `${employeeId || employeeUserId || 'employee'}-${suffix}-${timestamp}.jpg`,
      type: 'image/jpeg',
    });

    let locationData = null;
    let attendanceId = null;
    const attendanceDate = new Date().toISOString().split('T')[0];

    const buildAttendanceFormData = (suffix, forFaceAttendance = true) => {
      const normalizedPunchType = (punchType ?? '').toString().toUpperCase();
      const formData = new FormData();
      formData.append('punch_type', normalizedPunchType);
      formData.append('latitude', locationData?.latitude?.toString() || '0');
      formData.append('longitude', locationData?.longitude?.toString() || '0');
      formData.append('address', locationData?.address || '');
      formData.append('image_type', 'face');
      formData.append('date', attendanceDate);

      const resolvedUserId = forFaceAttendance ? employeeUserId : (supervisorId ?? employeeUserId);
      if (resolvedUserId) {
        formData.append('userId', resolvedUserId.toString());
      }

      if (attendanceId) {
        formData.append('attendance_id', attendanceId.toString());
      }
      if (employeeId) {
        formData.append('emp_id', employeeId.toString());
      }
      if (wardId) {
        formData.append('ward_id', wardId.toString());
      }

      formData.append('image', buildImageFile(suffix));
      return formData;
    };

    const performFallbackPunch = async () => {
      if (!wardId || !employeeId) {
        Alert.alert('Attendance', 'Unable to mark attendance without employee details. Please try again.');
        return;
      }

      if (!locationData) {
        Alert.alert('Attendance', 'Please recapture the photo to retry attendance.');
        setCapturedPhotoUri(null);
        return;
      }

      if (!attendanceId) {
        attendanceId = await resolveAttendanceId(ward, employee, attendanceDate);
      }

      const fallbackKey = `${wardId}-${employeeId}-${punchType}-fallback`;
      setPunchingMap(prev => ({ ...prev, [fallbackKey]: true }));

      try {
        const fallbackFormData = buildAttendanceFormData('attendance-fallback', false);
        await apiService.punchInOut(fallbackFormData);
        Alert.alert('Attendance', `${employee.emp_name || 'Employee'} attendance recorded without face verification.`);
        resetCameraState();
        await fetchDashboardStats();
      } catch (fallbackError) {
        console.error('Fallback punch failed:', fallbackError);
        const fallbackMessage =
          fallbackError.response?.data?.message ||
          fallbackError.response?.data?.error ||
          'Unable to mark attendance right now. Please try again.';
        Alert.alert('Attendance', fallbackMessage);
      } finally {
        setPunchingMap(prev => {
          const updated = { ...prev };
          delete updated[fallbackKey];
          return updated;
        });
      }
    };

    if (mode === 'storeFace') {
      toggleFaceEnrollmentLoading(enrollmentKey, true);

      try {
        const formData = new FormData();
        formData.append('userId', employeeUserId.toString());
        if (employeeId) {
          formData.append('emp_id', employeeId.toString());
        }
        formData.append('image', buildImageFile('face-store'));

        const response = await apiService.storeFace(formData);
        const message =
          response?.data?.message ||
          response?.data?.status ||
          'Face image stored successfully.';

        markEmployeeFaceEnrollment(wardId, employeeId, {
          imageUrl:
            response?.data?.imageUrl ||
            response?.data?.data?.imageUrl ||
            null,
        });

        Alert.alert('Face Enrollment', message);
        resetCameraState();
        await fetchDashboardStats();
      } catch (error) {
        console.error('Face enrollment failed:', error);
        const status = error.response?.status;
        const message =
          error.response?.data?.details ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Unable to store face image right now. Please try again.';

        if (status === 409) {
          Alert.alert(
            'Face Enrollment',
            `${message}
Please delete the existing face from the Face Enrollment Center before capturing a new one.`
          );
        } else {
          Alert.alert('Face Enrollment', message);
        }
      } finally {
        toggleFaceEnrollmentLoading(enrollmentKey, false);
      }

      return;
    }

    if (mode !== 'attendance' || !wardId || !employeeId || !punchType) {
      Alert.alert('Attendance', 'Missing attendance details. Please try again.');
      return;
    }

    const attendanceKey = `${wardId}-${employeeId}-${punchType}`;
    setPunchingMap(prev => ({ ...prev, [attendanceKey]: true }));

    try {
      try {
        locationData = await attendanceService.getCurrentLocation();
      } catch (error) {
        console.error('Location retrieval failed:', error);
        Alert.alert('Location', 'Unable to access your location. Please enable location services and try again.');
        setPunchingMap(prev => {
          const updated = { ...prev };
          delete updated[attendanceKey];
          return updated;
        });
        return;
      }

      attendanceId = await resolveAttendanceId(ward, employee, attendanceDate);

      const attendanceFormData = buildAttendanceFormData('face-attendance', true);

      const response = await apiService.faceAttendance(attendanceFormData);
      const responseMessage =
        response?.data?.message ||
        response?.data?.status ||
        `${employee.emp_name || 'Employee'} successfully punched ${punchType === 'in' ? 'in' : 'out'}.`;

      Alert.alert('Attendance', responseMessage);
      resetCameraState();
      await fetchDashboardStats();
    } catch (error) {
      console.error('Face attendance failed:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Unable to mark attendance right now. Please try again.';
      Alert.alert('Attendance', message);
    } finally {
      setPunchingMap(prev => {
        const updated = { ...prev };
        delete updated[attendanceKey];
        return updated;
      });
    }
  };

  const quickActions = [
    {
      id: 'employees',
      label: 'View My Employees',
      description: 'Manage your full team roster',
      icon: 'people',
      onPress: navigateToEmployees,
    },
    {
      id: 'attendance-reports',
      label: 'Attendance Reports',
      description: 'Review daily and historical trends',
      icon: 'bar-chart',
      onPress: navigateToReports,
    },
    {
      id: 'today-attendance',
      label: "Today's Attendance",
      description: 'Check realtime punch-in status',
      icon: 'calendar',
      onPress: navigateToTodayAttendance,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'See recent alerts and reminders',
      icon: 'notifications',
      onPress: navigateToNotifications,
    },
    {
      id: 'face-gallery',
      label: 'Face Gallery',
      description: 'Review employee face uploads',
      icon: 'image',
      onPress: navigateToFaceGallery,
    },
    {
      id: 'attendance-images',
      label: 'Attendance Images',
      description: 'Fetch punch-in/out photos',
      icon: 'image-outline',
      onPress: navigateToAttendanceImages,
    },
    {
      id: 'employee-search',
      label: 'Employee Search',
      description: 'Quickly find team members',
      icon: 'search',
      onPress: handleEmployeeSearch,
    },
    {
      id: 'ward-overview',
      label: 'Ward Overview',
      description: 'Review assigned ward details',
      icon: 'navigate',
      onPress: handleWardOverview,
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Download reports and attendance',
      icon: 'download',
      onPress: handleExportData,
    },
    {
      id: 'emergency-contacts',
      label: 'Emergency Contacts',
      description: 'Access important support numbers',
      icon: 'call',
      onPress: handleEmergencyContacts,
    },
    {
      id: 'feedback',
      label: 'Send Feedback',
      description: 'Share issues or suggestions',
      icon: 'chatbubble',
      onPress: handleFeedback,
    },
  ];

  const markedAttendanceCount = useMemo(() => {
    if (typeof stats.markedCount === 'number') {
      return stats.markedCount;
    }

    let count = 0;
    wardEmployees.forEach(ward => {
      (ward?.employees || []).forEach(employee => {
        const status = (employee?.attendance_status || '').toString().trim().toLowerCase();
        if (status.includes('marked')) {
          count += 1;
        }
      });
    });
    return count;
  }, [stats.markedCount, wardEmployees]);

  const attendanceRate = stats.totalEmployees > 0
    ? Math.min(100, Math.round(((stats.presentToday + markedAttendanceCount) / stats.totalEmployees) * 100))
    : 0;

  const formattedRangeLabel = useMemo(() => {
    const startLabel = formatDateDisplay(dateRange.start);
    const endLabel = formatDateDisplay(dateRange.end);
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }, [dateRange]);

  const todayIso = useMemo(() => toISODate(new Date()), []);

  const isDefaultRange = useMemo(() => {
    return toISODate(dateRange.start) === todayIso && toISODate(dateRange.end) === todayIso;
  }, [dateRange, todayIso]);

  const summaryMessage = stats.totalEmployees > 0
    ? `${markedAttendanceCount} employees fully marked, ${stats.presentToday} in progress, and ${stats.absentCount} still pending between ${formattedRangeLabel}. Tracking ${stats.totalEmployees} team members across your wards.`
    : 'No employees have been assigned yet. Once your team is connected, you\'ll see live attendance insights here.';

  const statHighlights = [
    {
      id: 'total-employees',
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: 'people',
      iconColor: '#007bff',
      iconBackground: 'rgba(0, 123, 255, 0.12)',
      helper: 'Across all assigned wards',
    },
    {
      id: 'present-today',
      label: 'In Progress',
      value: stats.presentToday,
      icon: 'checkmark-done',
      iconColor: '#28a745',
      iconBackground: 'rgba(40, 167, 69, 0.12)',
      helper: 'Punch-ins without checkout',
    },
    {
      id: 'marked-attendance',
      label: 'Marked Attendance',
      value: markedAttendanceCount,
      icon: 'clipboard',
      iconColor: '#ff8f1f',
      iconBackground: 'rgba(255, 143, 31, 0.12)',
      helper: 'Fully completed in range',
    },
    {
      id: 'absent-today',
      label: 'Not Marked',
      value: stats.absentCount,
      icon: 'alert-circle',
      iconColor: '#dc3545',
      iconBackground: 'rgba(220, 53, 69, 0.12)',
      helper: 'No punches recorded yet',
    },
    {
      id: 'attendance-rate',
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: 'speedometer',
      iconColor: '#20a4f3',
      iconBackground: 'rgba(32, 164, 243, 0.12)',
      helper: 'Completion for selected range',
    },
    {
      id: 'total-wards',
      label: 'Assigned Wards',
      value: stats.totalWards,
      icon: 'navigate',
      iconColor: '#6f42c1',
      iconBackground: 'rgba(111, 66, 193, 0.12)',
      helper: 'Locations you manage',
    },
  ];

  const statRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < statHighlights.length; i += 2) {
      rows.push(statHighlights.slice(i, i + 2));
    }
    return rows;
  }, [statHighlights]);

  const captureMode = pendingCapture?.mode;
  const isFaceEnrollmentMode = captureMode === 'storeFace';
  const activePunchType = pendingCapture?.punchType;
  const cameraTitleText = isFaceEnrollmentMode
    ? 'Store Face Photo'
    : activePunchType
      ? `Capture ${activePunchType === 'out' ? 'Punch Out' : 'Punch In'} Photo`
      : 'Capture Attendance Photo';
  const submitButtonLabel = isFaceEnrollmentMode ? 'Save Face' : 'Submit Attendance';
  const cameraHintText = isFaceEnrollmentMode
    ? 'Ensure the employee face is clear before saving.'
    : 'Review the photo. Retake if it is unclear.';
  const cameraActionSuffix = isFaceEnrollmentMode
    ? ' • Action: Store Face'
    : activePunchType
      ? ` • Action: Punch ${activePunchType === 'out' ? 'Out' : 'In'}`
      : '';
  const cameraFooterSummary = pendingCapture?.employee
    ? `Employee: ${pendingCapture.employee.emp_name || ''} • Ward: ${pendingCapture.ward?.ward_name || ''}${cameraActionSuffix}`
    : null;

  const getAttendanceStatusTheme = (status) => {
    switch (status) {
      case 'Present':
        return { text: '#18794e', background: 'rgba(24, 121, 78, 0.12)' };
      case 'Marked':
        return { text: '#0b5ed7', background: 'rgba(0, 91, 197, 0.12)' };
      case 'Not Marked':
        return { text: '#b42318', background: 'rgba(180, 35, 24, 0.12)' };
      default:
        return { text: '#475467', background: 'rgba(71, 84, 103, 0.12)' };
    }
  };

  const getActionWidth = () => {
    if (isDesktop) return `${100 / 3 - 1}%`;
    if (isTablet) return `${100 / 2 - 0.8}%`;
    return '100%';
  };

  const activeEnrollmentKey = useMemo(() => {
    if (pendingCapture?.mode !== 'storeFace') {
      return null;
    }

    const wardId = pendingCapture?.ward?.ward_id;
    const employeeId =
      pendingCapture?.employee?.emp_id ??
      pendingCapture?.employee?.empId ??
      pendingCapture?.employee?.employee_id ??
      pendingCapture?.employee?.employeeId ??
      pendingCapture?.employee?.id ??
      null;

    if (!wardId || !employeeId) {
      return null;
    }

    return `${wardId}-${employeeId}`;
  }, [pendingCapture]);

  const faceEnrollmentEntries = useMemo(() => {
    const items = [];

    wardEmployees.forEach(ward => {
      const wardId = ward?.ward_id;
      if (!wardId) {
        return;
      }

      (ward?.employees || []).forEach(employee => {
        const employeeId =
          employee?.emp_id ??
          employee?.empId ??
          employee?.employee_id ??
          employee?.employeeId ??
          employee?.id ??
          null;

        if (!employeeId) {
          return;
        }

        const enrollmentKey = `${wardId}-${employeeId}`;
        const punchInKey = `${wardId}-${employeeId}-in`;
        const punchOutKey = `${wardId}-${employeeId}-out`;

        const hasFaceEnrollment =
          employee?.face_verified === true ||
          employee?.face_enrolled === true ||
          employee?.face_registered === true ||
          employee?.faceRegistered === true ||
          !!employee?.face_image_url ||
          !!employee?.faceImageUrl ||
          !!employee?.faceEnrollmentUrl;

        items.push({
          key: enrollmentKey,
          ward,
          employee,
          hasFaceEnrollment,
          isLoading: !!faceEnrollmentMap[enrollmentKey],
          isPunchBusy: !!(punchingMap[punchInKey] || punchingMap[punchOutKey]),
          isActive: activeEnrollmentKey === enrollmentKey,
        });
      });
    });

    return items.sort((a, b) => {
      if (a.hasFaceEnrollment !== b.hasFaceEnrollment) {
        return a.hasFaceEnrollment ? 1 : -1;
      }

      const nameA = (a.employee?.emp_name || '').toLowerCase();
      const nameB = (b.employee?.emp_name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [wardEmployees, faceEnrollmentMap, punchingMap, activeEnrollmentKey, cameraVisible, facePreview]);

  const totalFaceCandidates = faceEnrollmentEntries.length;
  const totalFaceEnrolled = faceEnrollmentEntries.filter(item => item.hasFaceEnrollment).length;
  const isTwoColumnLayout = isTablet || isDesktop;

  const closeFacePreview = useCallback(() => {
    setFacePreview(null);
  }, []);

  const viewFaceDetails = useCallback(async (entry) => {
    if (!entry?.employee?.emp_id) {
      return;
    }

    const entryKey = entry.key;
    toggleFaceEnrollmentLoading(entryKey, true);

    try {
      const response = await apiService.getFaceEnrollment(entry.employee.emp_id);
      const face = response?.data?.face ?? response?.data ?? null;

      if (!face?.imageUrl) {
        Alert.alert('Face Enrollment', 'No face image found for this employee.');
        return;
      }

      const rawConfidence = face?.confidence;
      const numericConfidence =
        typeof rawConfidence === 'number'
          ? rawConfidence
          : Number.isFinite(Number(rawConfidence))
            ? Number(rawConfidence)
            : null;

      setFacePreview({
        imageUrl: face.imageUrl,
        employeeName: entry.employee?.emp_name || 'Employee',
        wardName: entry.ward?.ward_name || null,
        confidence: numericConfidence,
      });
    } catch (error) {
      console.error('fetch face info failed:', error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message ||
        'Unable to fetch face details right now. Please try again.';
      Alert.alert('Face Enrollment', message);
    } finally {
      toggleFaceEnrollmentLoading(entryKey, false);
    }
  }, [toggleFaceEnrollmentLoading]);

  const performFaceDeletion = useCallback(async (entry) => {
    if (!entry?.employee?.emp_id) {
      return;
    }

    const entryKey = entry.key;
    const wardId = entry.ward?.ward_id;
    const employeeId = entry.employee?.emp_id;

    toggleFaceEnrollmentLoading(entryKey, true);

    try {
      await apiService.deleteFaceEnrollment(employeeId);
      clearEmployeeFaceEnrollment(wardId, employeeId);
      await fetchDashboardStats();

      Alert.alert(
        'Face Enrollment',
        'Existing face removed. Capture a new face now.',
        [
          {
            text: 'Capture Now',
            onPress: () => openFaceEnrollmentCapture(entry.ward, entry.employee),
          },
          { text: 'Later', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('delete face failed:', error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message ||
        'Unable to delete the stored face right now. Please try again.';
      Alert.alert('Face Enrollment', message);
    } finally {
      toggleFaceEnrollmentLoading(entryKey, false);
    }
  }, [toggleFaceEnrollmentLoading, clearEmployeeFaceEnrollment, fetchDashboardStats, openFaceEnrollmentCapture]);

  const promptFaceDeletion = useCallback((entry) => {
    Alert.alert(
      'Delete stored face?',
      'Deleting will remove the existing face image from the system. You must capture a new face afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performFaceDeletion(entry) },
      ]
    );
  }, [performFaceDeletion]);

  const handleFaceEnrollmentAction = useCallback((entry) => {
    if (!entry) {
      return;
    }

    if (!entry.hasFaceEnrollment) {
      openFaceEnrollmentCapture(entry.ward, entry.employee);
      return;
    }

    Alert.alert(
      'Face already stored',
      'Delete the existing face before uploading a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Face', onPress: () => viewFaceDetails(entry) },
        {
          text: 'Delete & Capture',
          style: 'destructive',
          onPress: () => promptFaceDeletion(entry),
        },
      ]
    );
  }, [openFaceEnrollmentCapture, viewFaceDetails, promptFaceDeletion]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hello, {user?.name || 'Supervisor'}!</Text>
            <Text style={styles.subGreeting}>Here's your team snapshot for today</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </View>
        </View>
        <View style={styles.headerMeta}>
          <Ionicons name="time-outline" size={14} color="#e2e6ff" />
          <Text style={styles.headerMetaText}>Last sync moments ago</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View
          style={[styles.dashboardLayout, isTwoColumnLayout && styles.dashboardLayoutWide]}
        >
          <View style={styles.dashboardMain}>
            <View style={styles.dateFilterCard}>
              <View style={styles.dateFilterHeader}>
                <Text style={styles.dateFilterTitle}>Attendance Range</Text>
                <TouchableOpacity
                  style={[styles.dateFilterReset, isDefaultRange && styles.dateFilterResetDisabled]}
                  onPress={resetDateRange}
                  disabled={isDefaultRange}
                >
                  <Ionicons name="refresh" size={14} color="#3f51b5" />
                  <Text style={styles.dateFilterResetText}>Reset</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateFilterRow}>
                <TouchableOpacity
                  style={styles.dateFilterButton}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color="#3f51b5" />
                  <View style={styles.dateFilterButtonContent}>
                    <Text style={styles.dateFilterLabel}>Start</Text>
                    <Text style={styles.dateFilterValue}>{formatDateDisplay(dateRange.start)}</Text>
                  </View>
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color="#6b778d" style={styles.dateFilterArrow} />
                <TouchableOpacity
                  style={styles.dateFilterButton}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-clear-outline" size={18} color="#3f51b5" />
                  <View style={styles.dateFilterButtonContent}>
                    <Text style={styles.dateFilterLabel}>End</Text>
                    <Text style={styles.dateFilterValue}>{formatDateDisplay(dateRange.end)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Compact Statistics Cards */}
            <View style={styles.statsGrid}>
              {statRows.map((row, rowIndex) => (
                <View
                  key={`stats-row-${rowIndex}`}
                  style={[styles.statsRow, rowIndex === statRows.length - 1 && styles.statsRowLast]}
                >
                  {row.map((card) => (
                    <View key={card.id} style={styles.statCard}>
                      <View style={[styles.statIconWrapper, { backgroundColor: card.iconBackground }]}>
                        <Ionicons name={card.icon} size={18} color={card.iconColor} />
                      </View>
                      <Text style={styles.statValue}>{card.value}</Text>
                      <Text style={styles.statLabel}>{card.label}</Text>
                      <Text style={styles.statHelper}>{card.helper}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Compact Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIconWrapper}>
                  <Ionicons name="bulb-outline" size={18} color="#ffb347" />
                </View>
                <Text style={styles.summaryTitle}>Daily Highlights</Text>
              </View>
              <Text style={styles.summaryText}>{summaryMessage}</Text>
            </View>

            {/* Attendance Marking */}
            <View style={styles.attendanceSection}>
              <View style={styles.attendanceHeaderRow}>
                <Text style={styles.sectionTitle}>Attendance Marking</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={fetchDashboardStats}>
                  <Ionicons name="refresh" size={16} color="#007bff" />
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {wardEmployees.length === 0 ? (
                <Text style={styles.attendanceEmpty}>No ward assignments available yet.</Text>
              ) : (
                wardEmployees.map(ward => {
                  const isExpanded = expandedAttendanceWards.has(ward.ward_id);
                  const employees = ward.employees || [];

                  return (
                    <View key={ward.ward_id} style={styles.attendanceCard}>
                      <TouchableOpacity
                        style={styles.attendanceCardHeader}
                        onPress={() => toggleAttendanceWard(ward.ward_id)}
                        activeOpacity={0.7}
                      >
                        <View>
                          <Text style={styles.attendanceWardName}>{ward.ward_name}</Text>
                          <Text style={styles.attendanceWardMeta}>
                            {employees.length} employee{employees.length === 1 ? '' : 's'} • Ward #{ward.ward_id}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color="#52606d"
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.attendanceEmployeesContainer}>
                          {employees.length === 0 ? (
                            <Text style={styles.attendanceEmptyText}>No employees assigned to this ward.</Text>
                          ) : (
                            employees.map(employee => {
                              const punchInKey = `${ward.ward_id}-${employee.emp_id}-in`;
                              const punchOutKey = `${ward.ward_id}-${employee.emp_id}-out`;
                              const isPunchingIn = punchingMap[punchInKey];
                              const isPunchingOut = punchingMap[punchOutKey];
                              const hasPunchIn = !!employee.has_punch_in;
                              const hasPunchOut = !!employee.has_punch_out;

                              const statusLabel = employee.attendance_status || 'Not Marked';
                              const statusTheme = getAttendanceStatusTheme(statusLabel);
                              const {
                                punchInDisplay,
                                punchOutDisplay,
                              } = getEmployeePunchTimes(employee);

                              return (
                                <View key={employee.emp_id || employee.emp_code} style={styles.attendanceEmployeeRow}>
                                  <View style={styles.attendanceEmployeeInfo}>
                                    <View style={styles.attendanceEmployeeHeader}>
                                      <Text style={styles.attendanceEmployeeName}>{employee.emp_name}</Text>
                                      <View
                                        style={[styles.attendanceStatusBadge, { backgroundColor: statusTheme.background }]}
                                        accessibilityRole="text"
                                        accessibilityLabel={`Current status ${statusLabel}`}
                                      >
                                        <Text style={[styles.attendanceStatusText, { color: statusTheme.text }]}>
                                          {statusLabel}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={styles.attendanceEmployeeMeta}>
                                      ID: {employee.emp_code} • {employee.designation || 'Staff'}
                                    </Text>
                                  </View>

                                  <View style={styles.attendanceActionRow}>
                                    <View style={styles.punchButtonRow}>
                                      <TouchableOpacity
                                        style={[
                                          styles.punchButton,
                                          styles.punchInButton,
                                          (isPunchingIn || isPunchingOut || hasPunchIn) && styles.punchButtonDisabled,
                                        ]}
                                        onPress={() => openPunchCapture(ward, employee, 'in')}
                                        disabled={isPunchingIn || isPunchingOut || hasPunchIn}
                                        activeOpacity={0.8}
                                      >
                                        {isPunchingIn ? (
                                          <ActivityIndicator size="small" color="#fff" />
                                        ) : punchInDisplay ? (
                                          <Text style={styles.punchButtonText}>{`In • ${punchInDisplay}`}</Text>
                                        ) : (
                                          <Text style={styles.punchButtonText}>Punch In</Text>
                                        )}
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.punchButton,
                                          styles.punchOutButton,
                                          (isPunchingIn || isPunchingOut || !hasPunchIn || hasPunchOut) && styles.punchButtonDisabled,
                                        ]}
                                        onPress={() => openPunchCapture(ward, employee, 'out')}
                                        disabled={isPunchingIn || isPunchingOut || !hasPunchIn || hasPunchOut}
                                        activeOpacity={0.8}
                                      >
                                        {isPunchingOut ? (
                                          <ActivityIndicator size="small" color="#fff" />
                                        ) : punchOutDisplay ? (
                                          <Text style={styles.punchButtonText}>{`Out • ${punchOutDisplay}`}</Text>
                                        ) : (
                                          <Text style={styles.punchButtonText}>Punch Out</Text>
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Compact Quick Actions Grid */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={[styles.actionCard, { width: getActionWidth() }]}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionIconContainer}>
                      <Ionicons name={action.icon} size={18} color="#007bff" />
                    </View>
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>{action.label}</Text>
                      <Text style={styles.actionSubtitle}>{action.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#b0b6c2" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.faceSidebarWrapper,
              isTwoColumnLayout && styles.faceSidebarWrapperWide,
            ]}
          >
            <View style={styles.faceSidebarCard}>
              <View style={styles.faceSidebarHeader}>
                <View style={styles.faceSidebarAvatar}>
                  <Ionicons name="person-circle-outline" size={28} color="#3f51b5" />
                </View>
                <View style={styles.faceSidebarHeaderText}>
                  <Text style={styles.faceSidebarTitle}>{user?.name || 'Supervisor'}</Text>
                  <Text style={styles.faceSidebarSubtitle}>Face Enrollment Center</Text>
                </View>
              </View>

              <View style={styles.faceSidebarSummaryRow}>
                <View style={styles.faceSidebarSummaryItem}>
                  <Text style={styles.faceSidebarSummaryValue}>{totalFaceEnrolled}</Text>
                  <Text style={styles.faceSidebarSummaryLabel}>Enrolled</Text>
                </View>
                <View style={styles.faceSidebarSummaryDivider} />
                <View style={styles.faceSidebarSummaryItem}>
                  <Text style={styles.faceSidebarSummaryValue}>{totalFaceCandidates}</Text>
                  <Text style={styles.faceSidebarSummaryLabel}>Employees</Text>
                </View>
              </View>

              <Text style={styles.faceSidebarHint}>
                {totalFaceCandidates
                  ? 'Refresh or capture faces without leaving this screen.'
                  : 'Employees will appear here as soon as wards sync.'}
              </Text>

              <View style={styles.faceSidebarList}>
                {faceEnrollmentEntries.length === 0 ? (
                  <Text style={styles.faceSidebarEmpty}>No employees available for enrollment.</Text>
                ) : (
                  faceEnrollmentEntries.map(entry => {
                  const buttonLabel = entry.hasFaceEnrollment ? 'Manage Face' : 'Store Face';
                  const disableAction =
                    entry.isLoading || entry.isPunchBusy || cameraVisible || !!facePreview;

                    return (
                      <View
                        key={entry.key}
                        style={[
                          styles.faceSidebarRow,
                          entry.isActive && styles.faceSidebarActiveRow,
                        ]}
                      >
                        <View style={styles.faceSidebarRowHeader}>
                          <Text style={styles.faceSidebarEmployee}>{entry.employee?.emp_name || 'Employee'}</Text>
                          <View
                            style={[
                              styles.faceStatusChip,
                              entry.hasFaceEnrollment
                                ? styles.faceStatusChipSuccess
                                : styles.faceStatusChipPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.faceStatusChipText,
                                entry.hasFaceEnrollment
                                  ? styles.faceStatusChipTextSuccess
                                  : styles.faceStatusChipTextPending,
                              ]}
                            >
                              {entry.hasFaceEnrollment ? 'Current' : 'Pending'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.faceSidebarRowMeta}>
                          Ward: {entry.ward?.ward_name || `#${entry.ward?.ward_id}`} • ID: {entry.employee?.emp_code || entry.employee?.emp_id}
                        </Text>
                        <View style={styles.faceSidebarActionRow}>
                          <TouchableOpacity
                          style={[
                            styles.faceSidebarActionButton,
                            entry.hasFaceEnrollment && styles.faceSidebarActionButtonSecondary,
                            disableAction && styles.faceSidebarActionButtonDisabled,
                          ]}
                          onPress={() => handleFaceEnrollmentAction(entry)}
                          disabled={disableAction}
                          activeOpacity={0.8}
                          >
                            {entry.isLoading ? (
                              <ActivityIndicator size="small" color="#3f51b5" />
                            ) : (
                              <Text
                                style={[
                                  styles.faceSidebarActionText,
                                  entry.hasFaceEnrollment && styles.faceSidebarActionTextSecondary,
                                ]}
                              >
                                {buttonLabel}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
        </View>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={dateRange.start}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={dateRange.end}
          onChange={handleStartDateChange}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={dateRange.end}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={dateRange.start}
          onChange={handleEndDateChange}
        />
      )}

      {facePreview && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={closeFacePreview}
        >
          <View style={styles.facePreviewOverlay}>
            <View style={styles.facePreviewCard}>
              <TouchableOpacity
                style={styles.facePreviewClose}
                onPress={closeFacePreview}
                accessibilityRole="button"
                accessibilityLabel="Close face preview"
              >
                <Ionicons name="close" size={20} color="#1f2933" />
              </TouchableOpacity>
              <Text style={styles.facePreviewTitle}>{facePreview.employeeName}</Text>
              {facePreview.wardName ? (
                <Text style={styles.facePreviewMeta}>Ward: {facePreview.wardName}</Text>
              ) : null}
              {typeof facePreview.confidence === 'number' ? (
                <Text style={styles.facePreviewMeta}>
                  Confidence: {facePreview.confidence.toFixed(2)}%
                </Text>
              ) : null}
              <Image
                source={{ uri: facePreview.imageUrl }}
                style={styles.facePreviewImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </Modal>
      )}
      </View>

      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={resetCameraState}
        transparent
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>{cameraTitleText}</Text>
              <TouchableOpacity onPress={resetCameraState}>
                <Ionicons name="close" size={24} color="#1f2933" />
              </TouchableOpacity>
            </View>

            {capturedPhotoUri ? (
              <View style={styles.cameraPreviewWrapper}>
                <Image source={{ uri: capturedPhotoUri }} style={styles.cameraPreview} />
                <Text style={styles.cameraHint}>{cameraHintText}</Text>
              </View>
            ) : (
              <CameraView
                ref={cameraRef}
                style={styles.cameraPreview}
                facing={cameraFacing}
              />
            )}

            <View style={styles.cameraActions}>
              {capturedPhotoUri ? (
                <>
                  <TouchableOpacity style={[styles.cameraButton, styles.cameraRetakeButton]} onPress={() => setCapturedPhotoUri(null)}>
                    <Ionicons name="camera" size={18} color="#007bff" />
                    <Text style={styles.cameraButtonTextPrimary}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cameraButton, styles.cameraSubmitButton]}
                    onPress={submitCapturedPhoto}
                  >
                    <Text style={styles.cameraSubmitText}>{submitButtonLabel}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.cameraButton, styles.cameraCaptureButton]} onPress={handleCapturePhoto}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.cameraCaptureText}>Capture Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {!capturedPhotoUri && (
              <TouchableOpacity style={styles.cameraToggleButton} onPress={() => setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'))}>
                <Ionicons name="camera-reverse" size={20} color="#1f2933" />
                <Text style={styles.cameraToggleText}>
                  {cameraFacing === 'front' ? 'Use Back Camera' : 'Use Front Camera'}
                </Text>
              </TouchableOpacity>
            )}

            {cameraFooterSummary && (
              <Text style={styles.cameraFooterText}>
                {cameraFooterSummary}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    marginHorizontal: 16,
    marginTop: 50,
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 16,
  },
  headerText: {
    flex: 2,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 25,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  subGreeting: {
    fontSize: 13,
    color: '#e8f7ff',
    marginTop: 3,
    fontWeight: '400',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  headerMetaText: {
    color: '#e8f7ff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingTop: 4,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  dashboardLayout: {
    width: '100%',
    flexDirection: 'column',
  },
  dashboardLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dashboardMain: {
    flex: 1,
  },
  dateFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  dateFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateFilterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  dateFilterReset: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateFilterResetDisabled: {
    opacity: 0.5,
  },
  dateFilterResetText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#3f51b5',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9def0',
  },
  dateFilterButtonContent: {
    marginLeft: 8,
  },
  dateFilterLabel: {
    fontSize: 11,
    color: '#6b778d',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateFilterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2933',
  },
  dateFilterArrow: {
    marginHorizontal: 4,
  },
  faceSidebarWrapper: {
    width: '100%',
    marginTop: 16,
  },
  faceSidebarWrapperWide: {
    marginTop: 0,
    marginLeft: 16,
    maxWidth: 340,
    flexShrink: 0,
  },
  faceSidebarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  faceSidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  faceSidebarAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e7ecff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faceSidebarHeaderText: {
    flex: 1,
  },
  faceSidebarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2933',
  },
  faceSidebarSubtitle: {
    fontSize: 12,
    color: '#5f6c89',
    marginTop: 2,
  },
  faceSidebarSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  faceSidebarSummaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceSidebarSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
  },
  faceSidebarSummaryLabel: {
    fontSize: 11,
    color: '#6b778d',
    marginTop: 2,
  },
  faceSidebarSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e9f2',
  },
  faceSidebarHint: {
    fontSize: 12,
    color: '#5f6c89',
    lineHeight: 18,
    marginBottom: 12,
  },
  faceSidebarList: {
    width: '100%',
  },
  faceSidebarEmpty: {
    fontSize: 12,
    color: '#6b778d',
    fontStyle: 'italic',
  },
  faceSidebarRow: {
    backgroundColor: '#f6f7ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  faceSidebarActiveRow: {
    borderColor: '#3f51b5',
    backgroundColor: '#eef1ff',
  },
  faceSidebarRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  faceSidebarEmployee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
    flex: 1,
    marginRight: 12,
  },
  faceSidebarRowMeta: {
    fontSize: 11,
    color: '#6b778d',
    marginBottom: 10,
  },
  faceSidebarActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  faceSidebarActionButton: {
    backgroundColor: '#e6f0ff',
    borderWidth: 1,
    borderColor: '#c2d4ff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  faceSidebarActionButtonSecondary: {
    backgroundColor: '#f1f3ff',
    borderColor: '#c4c7f5',
  },
  faceSidebarActionButtonDisabled: {
    opacity: 0.6,
  },
  faceSidebarActionText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '600',
  },
  faceSidebarActionTextSecondary: {
    color: '#3f51b5',
  },
  faceStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  faceStatusChipSuccess: {
    borderColor: 'rgba(40, 167, 69, 0.4)',
    backgroundColor: 'rgba(40, 167, 69, 0.12)',
  },
  faceStatusChipPending: {
    borderColor: 'rgba(255, 143, 31, 0.4)',
    backgroundColor: 'rgba(255, 143, 31, 0.12)',
  },
  faceStatusChipText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  faceStatusChipTextSuccess: {
    color: '#217a3c',
  },
  faceStatusChipTextPending: {
    color: '#c45d0a',
  },
  facePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  facePreviewCard: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  facePreviewClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  facePreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
    marginBottom: 6,
    textAlign: 'center',
  },
  facePreviewMeta: {
    fontSize: 12,
    color: '#6b778d',
    marginBottom: 4,
    textAlign: 'center',
  },
  facePreviewImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginTop: 16,
  },
  statsGrid: {
    width: '100%',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 12,
  },
  statsRowLast: {
    marginBottom: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    marginHorizontal: 6,
  },
  statIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2933',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b778d',
    marginBottom: 2,
  },
  statHelper: {
    fontSize: 11,
    color: '#98a1b3',
    fontWeight: '400',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIconWrapper: {
    backgroundColor: 'rgba(255, 179, 0, 0.16)',
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  summaryText: {
    fontSize: 13,
    color: '#4f5d75',
    lineHeight: 18,
  },
  quickActionsSection: {
    marginBottom: 16,
  },
  attendanceSection: {
    marginBottom: 20,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  attendanceEmpty: {
    color: '#6b778d',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  attendanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceWardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  attendanceWardMeta: {
    fontSize: 12,
    color: '#6b778d',
    marginTop: 2,
  },
  attendanceEmployeesContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f7',
    paddingTop: 12,
    gap: 10,
  },
  attendanceEmployeeRow: {
    flexDirection: 'column',
    backgroundColor: '#f9fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf1f7',
    gap: 12,
  },
  attendanceEmployeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  attendanceEmployeeInfo: {
    width: '100%',
    gap: 6,
  },
  attendanceEmployeeName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  attendanceEmployeeMeta: {
    fontSize: 12,
    color: '#6b778d',
    marginTop: 2,
  },
  attendanceEmptyText: {
    fontSize: 12,
    color: '#6b778d',
    fontStyle: 'italic',
  },
  attendanceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceActionRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
    paddingTop: 4,
  },
  punchButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  punchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minHeight: 36,
    minWidth: 108,
    flexShrink: 0,
  },
  punchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  punchInButton: {
    backgroundColor: '#28a745',
  },
  punchOutButton: {
    backgroundColor: '#dc3545',
  },
  punchButtonDisabled: {
    opacity: 0.7,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cameraContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
  },
  cameraPreviewWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e3e7ef',
    backgroundColor: '#000',
  },
  cameraPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
  },
  cameraHint: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#6b778d',
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cameraToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  cameraToggleText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1f2933',
    fontWeight: '500',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
  },
  cameraCaptureButton: {
    backgroundColor: '#007bff',
  },
  cameraCaptureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cameraRetakeButton: {
    backgroundColor: 'rgba(0, 123, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#007bff',
    marginRight: 8,
  },
  cameraSubmitButton: {
    backgroundColor: '#28a745',
    marginLeft: 8,
  },
  cameraButtonTextPrimary: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cameraSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraFooterText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    color: '#52606d',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconContainer: {
    backgroundColor: 'rgba(0, 123, 255, 0.12)',
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 1,
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#6b778d',
    fontWeight: '400',
  },
});

export default DashboardScreen;
