import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';

const coercePunchType = (value) => {
  if (!value) return '';
  const normalised = value.trim().toLowerCase();
  if (normalised === 'in' || normalised === 'out') {
    return normalised;
  }
  return value.trim();
};

const resolveImageUri = (payload) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    // If looks like base64
    if (/^[A-Za-z0-9+/=]+$/.test(payload) && payload.length > 100) {
      return `data:image/jpeg;base64,${payload}`;
    }
    // Assume relative/absolute url
    return toAbsoluteUrl(payload);
  }

  if (typeof payload === 'object') {
    if (Array.isArray(payload)) {
      for (const entry of payload) {
        const resolved = resolveImageUri(entry);
        if (resolved) {
          return resolved;
        }
      }
    } else {
      const possibleKeys = [
        'url',
        'image_url',
        'imageUrl',
        'image',
        'image_path',
        'imagePath',
        'path',
        'data',
        'punch_image',
        'punchImage',
      ];
      for (const key of possibleKeys) {
        const value = payload[key];
        if (!value) continue;
        if (key === 'data') {
          if (typeof value === 'string') {
            return resolveImageUri(value);
          }
          if (typeof value === 'object') {
            const nested = resolveImageUri(value);
            if (nested) {
              return nested;
            }
          }
        } else if (typeof value === 'string') {
          return resolveImageUri(value);
        }
      }
    }
  }

  return null;
};

const toAbsoluteUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_CONFIG?.BASE_URL || '';
  if (!base) {
    return path;
  }
  const sanitisedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const sanitisedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${sanitisedBase}/${sanitisedPath}`;
};

const AttendanceImageScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [punchType, setPunchType] = useState('in');
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('single');
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [singleDate, setSingleDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [imageResults, setImageResults] = useState([]);

  const normaliseDate = useCallback((value) => {
    if (!value) {
      return '';
    }
    return value.trim();
  }, []);

  const isValidISODate = useCallback((value) => {
    if (!value) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) {
      return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }, []);

  const expandDateRange = useCallback((start, end) => {
    if (!start || !end) {
      return [];
    }
    const result = [];
    let cursor = new Date(start);
    const limit = new Date(end);

    while (cursor <= limit) {
      result.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
      if (result.length > 31) {
        break;
      }
    }

    return result;
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
        const { success, data, message } = await apiService.getSupervisorEmployees(supervisorId);
        if (!success) {
          console.warn('AttendanceImageScreen: failed to load employees', message);
          Alert.alert('Attendance Images', message || 'Unable to load employees.');
          setEmployeeOptions([]);
          return;
        }

        const options = [];
        (data || []).forEach(ward => {
          const wardEmployees = ward.employees || [];
          wardEmployees.forEach(employee => {
            const key = `${ward.ward_id || 'ward'}-${employee.emp_id || employee.emp_code || employee.id}`;
            options.push({
              key,
              label: `${employee.emp_name || 'Employee'} • Ward ${ward.ward_name || ward.ward_id || ''}`.trim(),
              employee,
              ward,
            });
          });
        });

        setEmployeeOptions(options);
        if (options.length > 0) {
          setSelectedEmployeeKey(options[0].key);
        }
      } catch (error) {
        console.error('AttendanceImageScreen: loadEmployees failed', error);
        Alert.alert('Attendance Images', 'Unable to load employees right now.');
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [user]);

  const selectedOption = useMemo(() => {
    return employeeOptions.find(option => option.key === selectedEmployeeKey) || null;
  }, [employeeOptions, selectedEmployeeKey]);

  const resolveAttendanceId = useCallback(async (option, dateISO) => {
    if (!option?.employee) {
      return null;
    }

    const { employee, ward } = option;
    const immediateId =
      employee?.attendance_id ??
      employee?.attendanceId ??
      employee?.attendance?.attendance_id ??
      employee?.attendance?.id ??
      employee?.current_attendance_id ??
      employee?.currentAttendanceId ??
      null;

    if (immediateId) {
      return immediateId;
    }

    try {
      const payload = {
        emp_id: employee?.emp_id,
        ward_id: ward?.ward_id,
        date: dateISO,
      };
      const response = await apiService.getAttendanceRecord(payload);
      const data = response?.data;
      console.log('AttendanceImageScreen: attendance record response', data);
      return (
        data?.attendance_id ??
        data?.attendanceId ??
        data?.id ??
        data?.data?.attendance_id ??
        data?.data?.attendanceId ??
        data?.data?.id ??
        data?.record?.attendance_id ??
        data?.record?.attendanceId ??
        data?.record?.id ??
        null
      );
    } catch (error) {
      console.warn('AttendanceImageScreen: resolveAttendanceId failed', error);
      return null;
    }
  }, []);

  const handleFetchImage = async () => {
    const finalPunchType = coercePunchType(punchType);

    if (!selectedOption) {
      Alert.alert('Attendance Image', 'Please select an employee.');
      return;
    }

    if (finalPunchType !== 'in' && finalPunchType !== 'out') {
      Alert.alert('Attendance Image', "Punch type must be either 'in' or 'out'.");
      return;
    }

    let datesToQuery = [];

    if (filterMode === 'single') {
      const dateValue = normaliseDate(singleDate);
      if (!isValidISODate(dateValue)) {
        Alert.alert('Attendance Image', 'Please provide a valid date in YYYY-MM-DD format.');
        return;
      }
      datesToQuery = [dateValue];
    } else {
      const startValue = normaliseDate(startDate);
      const endValue = normaliseDate(endDate);
      if (!isValidISODate(startValue) || !isValidISODate(endValue)) {
        Alert.alert('Attendance Image', 'Please provide valid start and end dates in YYYY-MM-DD format.');
        return;
      }
      if (new Date(startValue) > new Date(endValue)) {
        Alert.alert('Attendance Image', 'Start date must be earlier than or equal to end date.');
        return;
      }
      const expanded = expandDateRange(startValue, endValue);
      if (expanded.length === 0) {
        Alert.alert('Attendance Image', 'No dates found in the provided range.');
        return;
      }
      if (expanded.length > 31) {
        Alert.alert('Attendance Image', 'Please limit your range to 31 days or fewer.');
        return;
      }
      datesToQuery = expanded;
    }

    setLoading(true);
    setImageResults([]);

    try {
      const results = [];
      for (const dateISO of datesToQuery) {
        const attendanceId = await resolveAttendanceId(selectedOption, dateISO);
        if (!attendanceId) {
          continue;
        }

        try {
          console.log('AttendanceImageScreen: fetching image with', attendanceId, finalPunchType, 'for', dateISO);
          const response = await apiService.fetchImage(attendanceId, finalPunchType);
          const payload = response?.data;
          console.log('AttendanceImageScreen: fetchImage response', payload);
          const resolvedUri = resolveImageUri(payload);

          if (resolvedUri) {
            results.push({
              date: dateISO,
              imageUri: resolvedUri,
              meta: payload,
              attendanceId,
            });
          }
        } catch (innerError) {
          console.warn('AttendanceImageScreen: fetchImage failed for', dateISO, innerError);
        }
      }

      if (results.length === 0) {
        Alert.alert('Attendance Image', 'No images found for the selected criteria.');
        return;
      }

      setImageResults(results);
    } catch (error) {
      console.error('AttendanceImageScreen: fetch failed', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unable to fetch the attendance image.';
      Alert.alert('Attendance Image', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1f2933" />
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Attendance Images</Text>
            <Text style={styles.subtitle}>Fetch punch-in/out photos by attendance record</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Employee</Text>
          <View style={styles.pickerWrapper}>
            {loadingEmployees ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="small" color="#007bff" />
                <Text style={styles.pickerLoadingText}>Loading employees...</Text>
              </View>
            ) : employeeOptions.length === 0 ? (
              <Text style={styles.emptyText}>No employees available. Please sync your wards.</Text>
            ) : (
              <Picker
                selectedValue={selectedEmployeeKey}
                onValueChange={(value) => setSelectedEmployeeKey(value)}
                style={styles.picker}
              >
                {employeeOptions.map(option => (
                  <Picker.Item key={option.key} label={option.label} value={option.key} />
                ))}
              </Picker>
            )}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Punch Type</Text>
          <View style={styles.punchTypeRow}>
            {['in', 'out'].map(type => {
              const selected = punchType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.punchTypeButton, selected && styles.punchTypeButtonSelected]}
                  onPress={() => setPunchType(type)}
                >
                  <Text style={[styles.punchTypeText, selected && styles.punchTypeTextSelected]}>
                    {type === 'in' ? 'Punch In' : 'Punch Out'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Filter By</Text>
          <View style={styles.filterModeRow}>
            {['single', 'range'].map(mode => {
              const selected = filterMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.filterModeButton, selected && styles.filterModeButtonSelected]}
                  onPress={() => setFilterMode(mode)}
                >
                  <Text style={[styles.filterModeText, selected && styles.filterModeTextSelected]}>
                    {mode === 'single' ? 'Single Date' : 'Date Range'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filterMode === 'single' ? (
            <View style={styles.dateFieldGroup}>
              <Text style={styles.labelMuted}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-05-01"
                placeholderTextColor="#a0aec0"
                value={singleDate}
                onChangeText={setSingleDate}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <View style={styles.rangeContainer}>
              <View style={styles.rangeField}>
                <Text style={styles.labelMuted}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024-05-01"
                  placeholderTextColor="#a0aec0"
                  value={startDate}
                  onChangeText={setStartDate}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.rangeField}>
                <Text style={styles.labelMuted}>End Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024-05-07"
                  placeholderTextColor="#a0aec0"
                  value={endDate}
                  onChangeText={setEndDate}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.fetchButton}
            onPress={handleFetchImage}
            disabled={loading || loadingEmployees || employeeOptions.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.fetchButtonText}>Fetch Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {imageResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {imageResults.map(result => (
              <View key={`${result.date}-${result.attendanceId}`} style={styles.previewCard}>
                <Image source={{ uri: result.imageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewCaption}>{result.date}</Text>
                  <Text style={styles.previewSubCaption}>Attendance #{result.attendanceId}</Text>
                </View>
                {result.meta && typeof result.meta === 'object' && (
                  <View style={styles.metaContainer}>
                    {Object.entries(result.meta).map(([key, value]) => {
                      if (typeof value === 'string' || typeof value === 'number') {
                        return (
                          <View key={key} style={styles.metaRow}>
                            <Text style={styles.metaKey}>{key}</Text>
                            <Text style={styles.metaValue}>{String(value)}</Text>
                          </View>
                        );
                      }
                      return null;
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1f2933',
    backgroundColor: '#f9fafb',
  },
  punchTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    minHeight: 48,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    color: '#1f2933',
  },
  pickerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  pickerLoadingText: {
    fontSize: 13,
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    paddingVertical: 12,
    textAlign: 'center',
  },
  filterModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  filterModeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  filterModeButtonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  filterModeTextSelected: {
    color: '#fff',
  },
  dateFieldGroup: {
    marginTop: 12,
    gap: 6,
  },
  labelMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  rangeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rangeField: {
    flex: 1,
    gap: 6,
  },
  punchTypeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  punchTypeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  punchTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  punchTypeTextSelected: {
    color: '#fff',
  },
  fetchButton: {
    marginTop: 24,
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 16,
  },
  previewCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  previewSubCaption: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  metaValue: {
    fontSize: 12,
    color: '#6b7280',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

export default AttendanceImageScreen;
