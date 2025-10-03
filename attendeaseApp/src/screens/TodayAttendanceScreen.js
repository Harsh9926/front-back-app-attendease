import React, { useState, useEffect } from 'react';
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

const TodayAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchTodayAttendance();
  }, [user?.user_id, user?.id, user?.userId]);

  useEffect(() => {
    filterAttendanceData();
  }, [attendanceData, searchQuery, filterStatus]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message, raw } = await apiService.getSupervisorEmployees(supervisorId);
      
      if (success) {
        const wardsData = data || [];
        const allEmployees = [];
        
        wardsData.forEach(ward => {
          ward.employees?.forEach(employee => {
            allEmployees.push({
              ...employee,
              ward_name: ward.ward_name,
              ward_id: ward.ward_id,
            });
          });
        });
        
        setAttendanceData(allEmployees);
      } else {
        console.error('Today attendance API returned success: false', raw);
        if (message) {
          Alert.alert('Error', message);
        }
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      Alert.alert('Error', 'Failed to fetch today\'s attendance');
    } finally {
      setLoading(false);
    }
  };

  const filterAttendanceData = () => {
    let filtered = attendanceData;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.emp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.emp_code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filtered.filter(emp => emp.attendance_status === filterStatus);
    }

    setFilteredData(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodayAttendance();
    setRefreshing(false);
  };

  const getStatusCounts = () => {
    const counts = {
      All: attendanceData.length,
      Present: attendanceData.filter(emp => emp.attendance_status === 'Present').length,
      'Not Marked': attendanceData.filter(emp => emp.attendance_status === 'Not Marked').length,
      Marked: attendanceData.filter(emp => emp.attendance_status === 'Marked').length,
    };
    return counts;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#28a745';
      case 'Marked': return '#007bff';
      case 'Not Marked': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return 'checkmark-circle';
      case 'Marked': return 'time';
      case 'Not Marked': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.emp_name}</Text>
        <Text style={styles.employeeCode}>ID: {item.emp_code}</Text>
        <Text style={styles.employeeDetails}>{item.designation} • {item.department}</Text>
        <Text style={styles.wardInfo}>📍 {item.ward_name}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Ionicons
          name={getStatusIcon(item.attendance_status)}
          size={24}
          color={getStatusColor(item.attendance_status)}
        />
        <Text style={[styles.statusText, { color: getStatusColor(item.attendance_status) }]}>
          {item.attendance_status}
        </Text>
      </View>
    </View>
  );

  const FilterButton = ({ status, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.activeFilterButton
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterButtonText,
        filterStatus === status && styles.activeFilterButtonText
      ]}>
        {status} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading today's attendance...</Text>
      </View>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Today's Attendance</Text>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          <FilterButton status="All" count={statusCounts.All} />
          <FilterButton status="Present" count={statusCounts.Present} />
          <FilterButton status="Not Marked" count={statusCounts['Not Marked']} />
          <FilterButton status="Marked" count={statusCounts.Marked} />
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{statusCounts.Present}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: '#dc3545' }]}>
              {statusCounts['Not Marked']}
            </Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: '#007bff' }]}>
              {statusCounts.All > 0 ? ((statusCounts.Present / statusCounts.All) * 100).toFixed(1) : 0}%
            </Text>
            <Text style={styles.summaryLabel}>Attendance</Text>
          </View>
        </View>

        {/* Employee List */}
        <FlatList
          data={filteredData}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.emp_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  wardInfo: {
    fontSize: 12,
    color: '#007bff',
  },
  statusContainer: {
    alignItems: 'center',
    marginLeft: 15,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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

export default TodayAttendanceScreen;
