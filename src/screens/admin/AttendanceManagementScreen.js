import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../../services/apiService';

const AttendanceManagementScreen = ({ navigation }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('from');
  
  const [filters, setFilters] = useState({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    dateTo: new Date(),
    supervisorId: '',
    wardId: '',
    status: ''
  });

  const [supervisors, setSupervisors] = useState([]);
  const [wards, setWards] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadAttendanceRecords();
    loadSupervisors();
    loadWards();
  }, []);

  useEffect(() => {
    loadAttendanceRecords(true);
  }, [filters]);

  const loadAttendanceRecords = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPagination(prev => ({ ...prev, page: 1 }));
      }

      const params = {
        page: reset ? 1 : pagination.page,
        limit: pagination.limit,
        date_from: filters.dateFrom.toISOString().split('T')[0],
        date_to: filters.dateTo.toISOString().split('T')[0],
        supervisor_id: filters.supervisorId,
        ward_id: filters.wardId,
        status: filters.status
      };

      const response = await apiService.get('/admin/attendance', { params });
      
      if (reset) {
        setAttendanceRecords(response.data.attendance);
      } else {
        setAttendanceRecords(prev => [...prev, ...response.data.attendance]);
      }
      
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Load attendance records error:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const loadSupervisors = async () => {
    try {
      const response = await apiService.get('/admin/supervisors');
      setSupervisors(response.data);
    } catch (error) {
      console.error('Load supervisors error:', error);
    }
  };

  const loadWards = async () => {
    try {
      const response = await apiService.get('/admin/wards');
      setWards(response.data);
    } catch (error) {
      console.error('Load wards error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceRecords(true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      loadAttendanceRecords();
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFilters(prev => ({
        ...prev,
        [datePickerMode === 'from' ? 'dateFrom' : 'dateTo']: selectedDate
      }));
    }
  };

  const exportData = async () => {
    try {
      Alert.alert(
        'Export Data',
        'Choose export format:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'CSV', 
            onPress: () => exportAttendance('csv')
          },
          { 
            text: 'JSON', 
            onPress: () => exportAttendance('json')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Export failed');
    }
  };

  const exportAttendance = async (format) => {
    try {
      const params = {
        date_from: filters.dateFrom.toISOString().split('T')[0],
        date_to: filters.dateTo.toISOString().split('T')[0],
        format
      };

      const response = await apiService.get('/admin/export/attendance', { params });
      Alert.alert('Success', 'Data exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Export failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#28a745';
      case 'absent': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const AttendanceCard = ({ record }) => (
    <View style={styles.attendanceCard}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{record.employee_name}</Text>
          <Text style={styles.employeeCode}>ID: {record.emp_code}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(record.status) }
        ]}>
          <Ionicons 
            name={getStatusIcon(record.status)} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(record.created_at).toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.detailText}>
            {record.ward_name} ({record.zone_name})
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.detailText}>
            Supervisor: {record.supervisor_name || 'Not Assigned'}
          </Text>
        </View>
        {record.location_lat && record.location_lng && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate" size={16} color="#666" />
            <Text style={styles.detailText}>
              Location: {record.location_lat.toFixed(4)}, {record.location_lng.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Attendance Records</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Date Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerMode('from');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  From: {filters.dateFrom.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerMode('to');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  To: {filters.dateTo.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <Picker
              selectedValue={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value="" />
              <Picker.Item label="Present" value="present" />
              <Picker.Item label="Absent" value="absent" />
            </Picker>
          </View>

          {/* Supervisor Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Supervisor</Text>
            <Picker
              selectedValue={filters.supervisorId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, supervisorId: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Supervisors" value="" />
              {supervisors.map(supervisor => (
                <Picker.Item 
                  key={supervisor.user_id} 
                  label={supervisor.name} 
                  value={supervisor.user_id.toString()} 
                />
              ))}
            </Picker>
          </View>

          {/* Ward Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Ward</Text>
            <Picker
              selectedValue={filters.wardId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, wardId: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Wards" value="" />
              {wards.map(ward => (
                <Picker.Item 
                  key={ward.ward_id} 
                  label={`${ward.ward_name} (${ward.zone_name})`} 
                  value={ward.ward_id.toString()} 
                />
              ))}
            </Picker>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilters({
                  dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  dateTo: new Date(),
                  supervisorId: '',
                  wardId: '',
                  status: ''
                });
              }}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'from' ? filters.dateFrom : filters.dateTo}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Attendance Records</Text>
      <Text style={styles.emptyDescription}>
        No attendance records found for the selected criteria
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (pagination.page >= pagination.totalPages) return null;
    
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={exportData}
          >
            <Ionicons name="download-outline" size={24} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pagination.total}</Text>
          <Text style={styles.summaryLabel}>Total Records</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {attendanceRecords.filter(r => r.status === 'present').length}
          </Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {attendanceRecords.filter(r => r.status === 'absent').length}
          </Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
      </View>

      {/* Active Filters Display */}
      {(filters.status || filters.supervisorId || filters.wardId) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>Active Filters:</Text>
          {filters.status && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Status: {filters.status}</Text>
            </View>
          )}
          {filters.supervisorId && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>
                Supervisor: {supervisors.find(s => s.user_id.toString() === filters.supervisorId)?.name}
              </Text>
            </View>
          )}
          {filters.wardId && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>
                Ward: {wards.find(w => w.ward_id.toString() === filters.wardId)?.ward_name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Attendance Records List */}
      <FlatList
        data={attendanceRecords}
        keyExtractor={(item) => item.attendance_id.toString()}
        renderItem={({ item }) => <AttendanceCard record={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
      />

      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexWrap: 'wrap',
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  filterChip: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  employeeCode: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  loadMoreButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AttendanceManagementScreen;
