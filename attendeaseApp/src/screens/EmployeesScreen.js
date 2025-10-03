import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const EmployeesScreen = () => {
  const { user } = useAuth();
  const [wardsData, setWardsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWards, setExpandedWards] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const statusFilters = ['All', 'Present', 'Marked', 'Not Marked'];

  const filterEmployees = useCallback((employees = []) => {
    const safeQuery = typeof searchQuery === 'string' ? searchQuery : '';
    const normalizedQuery = safeQuery.trim().toLowerCase();

    return employees.filter(employee => {
      const matchesQuery =
        !normalizedQuery ||
        [employee.emp_name, employee.emp_code, employee.phone]
          .filter(Boolean)
          .some(value => value.toString().toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === 'All' || employee.attendance_status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const summary = useMemo(() => {
    let total = 0;
    let present = 0;

    wardsData.forEach(ward => {
      const filtered = filterEmployees(ward.employees || []);
      total += filtered.length;
      present += filtered.filter(emp => emp.attendance_status === 'Present').length;
    });

    return {
      total,
      present,
      absent: total - present,
    };
  }, [wardsData, filterEmployees]);

  const hasActiveFilters = useMemo(() => {
    const safeQuery = typeof searchQuery === 'string' ? searchQuery : '';
    return safeQuery.trim().length > 0 || statusFilter !== 'All';
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [user?.user_id, user?.id, user?.userId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      console.log('Fetching supervisor employees...');
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message, raw } = await apiService.getSupervisorEmployees(supervisorId);

      console.log('API Response:', raw);

      if (success) {
        setWardsData(data || []);
        console.log('Wards data set:', data);
      } else {
        console.error('API returned success: false', raw);
        Alert.alert('Error', message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to fetch employees. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const toggleWardExpansion = (wardId) => {
    const newExpanded = new Set(expandedWards);
    if (newExpanded.has(wardId)) {
      newExpanded.delete(wardId);
    } else {
      newExpanded.add(wardId);
    }
    setExpandedWards(newExpanded);
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return '#28a745';
      case 'Marked':
        return '#007bff';
      case 'Not Marked':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getAttendanceStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return 'checkmark-circle';
      case 'Marked':
        return 'time';
      case 'Not Marked':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.emp_name}</Text>
          <Text style={styles.employeeCode}>ID: {item.emp_code}</Text>
          <Text style={styles.employeeDetails}>{item.designation} • {item.department}</Text>
          <Text style={styles.employeePhone}>📞 {item.phone}</Text>
        </View>
        <View style={styles.attendanceStatus}>
          <Ionicons
            name={getAttendanceStatusIcon(item.attendance_status)}
            size={24}
            color={getAttendanceStatusColor(item.attendance_status)}
          />
          <Text style={[
            styles.attendanceText,
            { color: getAttendanceStatusColor(item.attendance_status) }
          ]}>
            {item.attendance_status}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderWard = ({ item }) => {
    const isExpanded = expandedWards.has(item.ward_id);
    const filteredEmployees = filterEmployees(item.employees || []);
    const totalEmployees = item.employees?.length || 0;
    const displayedEmployees = hasActiveFilters ? filteredEmployees : item.employees || [];
    const presentCount = displayedEmployees.filter(emp => emp.attendance_status === 'Present').length;
    const summaryLabel = hasActiveFilters
      ? `${displayedEmployees.length} match${displayedEmployees.length === 1 ? '' : 'es'} • ${presentCount} present`
      : `${totalEmployees} employees • ${presentCount} present today`;
    const noEmployeesMessage = hasActiveFilters
      ? 'No employees match your filters in this ward.'
      : 'No employees assigned to this ward';

    return (
      <View style={styles.wardContainer}>
        <TouchableOpacity
          style={styles.wardHeader}
          onPress={() => toggleWardExpansion(item.ward_id)}
        >
          <View style={styles.wardInfo}>
            <Text style={styles.wardName}>{item.ward_name}</Text>
            <Text style={styles.wardLocation}>{item.city} • {item.zone}</Text>
            <Text style={styles.employeeCount}>{summaryLabel}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.employeesContainer}>
            {displayedEmployees && displayedEmployees.length > 0 ? (
              <FlatList
                data={displayedEmployees}
                renderItem={renderEmployee}
                keyExtractor={(employee, index) =>
                  employee.emp_id ? employee.emp_id.toString() : `${employee.emp_code || 'employee'}-${index}`
                }
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noEmployeesText}>{noEmployeesMessage}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Employees</Text>
        <Text style={styles.subtitle}>Employees under your supervision</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, or phone"
            value={typeof searchQuery === 'string' ? searchQuery : ''}
            onChangeText={(text) => setSearchQuery(text ?? '')}
            placeholderTextColor="#a0a6b1"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {(typeof searchQuery === 'string' && searchQuery.length > 0) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#a0a6b1" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {statusFilters.map(filter => {
            const isActive = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Ionicons name="people" size={16} color="#007bff" />
            <View style={styles.summaryChipContent}>
              <Text style={styles.summaryChipLabel}>Matching Employees</Text>
              <Text style={styles.summaryChipValue}>{summary.total}</Text>
            </View>
          </View>
          <View style={styles.summaryChip}>
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
            <View style={styles.summaryChipContent}>
              <Text style={styles.summaryChipLabel}>Present</Text>
              <Text style={styles.summaryChipValue}>{summary.present}</Text>
            </View>
          </View>
          <View style={styles.summaryChip}>
            <Ionicons name="close-circle" size={16} color="#dc3545" />
            <View style={styles.summaryChipContent}>
              <Text style={styles.summaryChipLabel}>Not Present</Text>
              <Text style={styles.summaryChipValue}>{Math.max(summary.absent, 0)}</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={wardsData}
        renderItem={renderWard}
        keyExtractor={(item) => item.ward_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  toolbar: {
    backgroundColor: '#f5f7fb',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e3e7ef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2933',
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d8e5',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#007bff',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4f5d75',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#007bff',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e3e7ef',
    flexBasis: '30%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryChipContent: {
    marginLeft: 8,
  },
  summaryChipLabel: {
    fontSize: 11,
    color: '#6b778d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryChipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  listContainer: {
    padding: 15,
  },
  wardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  wardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  wardInfo: {
    flex: 1,
  },
  wardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  wardLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  employeeCount: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  employeesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  employeeCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  employeeCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  employeeDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  employeePhone: {
    fontSize: 12,
    color: '#666',
  },
  attendanceStatus: {
    alignItems: 'center',
    marginLeft: 10,
  },
  attendanceText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  noEmployeesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default EmployeesScreen;
