import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { Camera as CameraModule, CameraView } from 'expo-camera';
import attendanceService from '../services/attendanceService';

const DashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    totalWards: 0,
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
  const isTablet = width >= 600 && width < 900;
  const isDesktop = width >= 900;
  const attendanceRate = stats.totalEmployees > 0
    ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
    : 0;
  const summaryMessage = stats.totalEmployees > 0
    ? `${stats.presentToday} of ${stats.totalEmployees} employees are already present. Keep an eye on the wards with lower attendance to reach 100% completion.`
    : "No employees have been assigned yet. Once your team is connected, you'll see live attendance insights here.";
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

  const markEmployeeFaceEnrollment = useCallback((wardId, employeeId) => {
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
        };
      });

      return {
        ...ward,
        employees: updatedEmployees,
      };
    }));
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [user?.user_id, user?.id, user?.userId]);

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...');
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message, raw } = await apiService.getSupervisorEmployees(supervisorId);
      console.log('Dashboard API Response:', raw);

      if (success) {
        const wardsData = data || [];
        let totalEmployees = 0;
        let presentToday = 0;

        wardsData.forEach(ward => {
          totalEmployees += ward.employees?.length || 0;
          presentToday += ward.employees?.filter(emp => emp.attendance_status === 'Present').length || 0;
        });

        setStats({
          totalEmployees,
          presentToday,
          totalWards: wardsData.length,
        });

        setWardEmployees(wardsData);

        console.log('Stats updated:', { totalEmployees, presentToday, totalWards: wardsData.length });
      } else {
        console.error('Dashboard API returned success: false', raw);
        if (message) {
          Alert.alert('Dashboard', message);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Dashboard error details:', error.response?.data);
    }
  };

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
      setFaceEnrollmentMap(prev => ({ ...prev, [enrollmentKey]: true }));

      try {
        const formData = new FormData();
        formData.append('userId', employeeUserId.toString());
        formData.append('image', buildImageFile('face-store'));

        const response = await apiService.storeFace(formData);
        const message =
          response?.data?.message ||
          response?.data?.status ||
          'Face image stored successfully.';

        // Immediately reflect success in UI: flip the button to Re-upload (green)
        markEmployeeFaceEnrollment(wardId, employeeId);

        Alert.alert('Face Enrollment', message);
        resetCameraState();
        await fetchDashboardStats();
        // Re-apply local UI state in case the server payload hasn't updated yet
        markEmployeeFaceEnrollment(wardId, employeeId);
      } catch (error) {
        console.error('Face enrollment failed:', error);
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Unable to store face image right now. Please try again.';
        Alert.alert('Face Enrollment', message);
      } finally {
        setFaceEnrollmentMap(prev => {
          const updated = { ...prev };
          delete updated[enrollmentKey];
          return updated;
        });
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
      const storeFormData = new FormData();
      storeFormData.append('userId', employeeUserId.toString());
      storeFormData.append('image', buildImageFile('face-enroll'));

      try {
        const storeResponse = await apiService.storeFace(storeFormData);
        const storeMessage =
          storeResponse?.data?.message ||
          storeResponse?.data?.status ||
          null;

        if (storeMessage) {
          console.log('Face enrollment before attendance:', storeMessage);
        }
      } catch (storeError) {
        console.error('Automatic face store before attendance failed:', storeError);
        const storeMessage =
          storeError.response?.data?.message ||
          storeError.response?.data?.error ||
          'Unable to store face image. Please try again.';
        Alert.alert('Face Enrollment', storeMessage);
        return;
      }

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
      label: 'Present Today',
      value: stats.presentToday,
      icon: 'checkmark-done',
      iconColor: '#28a745',
      iconBackground: 'rgba(40, 167, 69, 0.12)',
      helper: 'Checked in so far',
    },
    {
      id: 'attendance-rate',
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: 'speedometer',
      iconColor: '#ff8f1f',
      iconBackground: 'rgba(255, 143, 31, 0.12)',
      helper: 'Daily performance',
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
  const statRows = [
    statHighlights.slice(0, 2),
    statHighlights.slice(2, 4),
  ];

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
                          const faceEnrollmentKey = `${ward.ward_id}-${employee.emp_id}`;
                          const isPunchingIn = punchingMap[punchInKey];
                          const isPunchingOut = punchingMap[punchOutKey];
                          const isFaceEnrollmentLoading = faceEnrollmentMap[faceEnrollmentKey];

                          const statusLabel = employee.attendance_status || 'Not Marked';
                          const statusTheme = getAttendanceStatusTheme(statusLabel);
                          const hasFaceEnrollment =
                            employee?.face_verified === true ||
                            employee?.face_enrolled === true ||
                            employee?.face_registered === true ||
                            employee?.faceRegistered === true ||
                            !!employee?.face_image_url ||
                            !!employee?.faceImageUrl ||
                            !!employee?.faceEnrollmentUrl;

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
                                    style={[styles.punchButton, styles.punchInButton, (isPunchingIn || isPunchingOut) && styles.punchButtonDisabled]}
                                    onPress={() => openPunchCapture(ward, employee, 'in')}
                                    disabled={isPunchingIn || isPunchingOut}
                                    activeOpacity={0.8}
                                  >
                                    {isPunchingIn ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Text style={styles.punchButtonText}>Punch In</Text>
                                    )}
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[styles.punchButton, styles.punchOutButton, (isPunchingIn || isPunchingOut) && styles.punchButtonDisabled]}
                                    onPress={() => openPunchCapture(ward, employee, 'out')}
                                    disabled={isPunchingIn || isPunchingOut}
                                    activeOpacity={0.8}
                                  >
                                    {isPunchingOut ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Text style={styles.punchButtonText}>Punch Out</Text>
                                    )}
                                  </TouchableOpacity>
                                </View>

                                <View style={styles.faceStoreRow}>
                                  <TouchableOpacity
                                    style={[styles.punchButton, styles.faceStoreButton, hasFaceEnrollment && styles.faceStoreButtonSecondary, isFaceEnrollmentLoading && styles.punchButtonDisabled]}
                                    onPress={() => openFaceEnrollmentCapture(ward, employee)}
                                    disabled={isFaceEnrollmentLoading || isPunchingIn || isPunchingOut}
                                    activeOpacity={0.8}
                                  >
                                    {isFaceEnrollmentLoading ? (
                                      <ActivityIndicator size="small" color="#007bff" />
                                    ) : (
                                      <Text style={[styles.faceStoreButtonText, hasFaceEnrollment && styles.faceStoreButtonTextSecondary]}>
                                        {hasFaceEnrollment ? 'Re-upload' : 'Store Face'}
                                      </Text>
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
  faceStoreRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
  faceStoreButton: {
    backgroundColor: '#e6f0ff',
    borderWidth: 1,
    borderColor: '#c2d4ff',
  },
  faceStoreButtonSecondary: {
    backgroundColor: '#d1fae5', // light green
    borderColor: '#10b981', // emerald
  },
  faceStoreButtonText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '600',
  },
  faceStoreButtonTextSecondary: {
    color: '#065f46', // dark green text
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
