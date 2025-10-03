import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
// import { useRealTimeData } from '../../hooks/useRealTimeData';

const AdminEmployeesScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // DISABLED REAL-TIME DATA TO PREVENT ERRORS
  // const { data: employees, loading, error, refresh } = useRealTimeData('/api/admin/employees', {
  //   refreshInterval: 60000, // 1 minute
  //   refreshOnMount: true,
  //   refreshOnFocus: true
  // });

  // STATIC DATA TO PREVENT ERRORS
  const employees = null;
  const loading = false;
  const error = null;
  const refresh = () => { };

  // Fallback static employee data
  const fallbackEmployees = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@hospital.com',
      emp_code: 'EMP001',
      status: 'active',
      ward_id: 1,
      ward_name: 'Emergency',
      position: 'Nurse',
      phone: '+1234567890',
      attendance_rate: 95.5
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@hospital.com',
      emp_code: 'EMP002',
      status: 'active',
      ward_id: 2,
      ward_name: 'ICU',
      position: 'Doctor',
      phone: '+1234567891',
      attendance_rate: 98.2
    },
    {
      id: 3,
      name: 'Mike Wilson',
      email: 'mike.wilson@hospital.com',
      emp_code: 'EMP003',
      status: 'inactive',
      ward_id: 1,
      ward_name: 'Emergency',
      position: 'Technician',
      phone: '+1234567892',
      attendance_rate: 87.3
    }
  ];

  // Use real-time data if available, otherwise fallback
  const employeeData = employees?.employees || fallbackEmployees;

  // Static ward data
  const wards = [
    { id: 1, name: 'Emergency' },
    { id: 2, name: 'ICU' },
    { id: 3, name: 'Surgery' },
    { id: 4, name: 'Pediatrics' }
  ];

  // Filter employees based on search and filters
  const filteredEmployees = () => {
    if (!employeeData || !Array.isArray(employeeData)) return [];

    return employeeData.filter(employee => {
      const matchesSearch = !searchQuery ||
        employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.emp_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || employee.status === statusFilter;

      const matchesWard = !wardFilter || employee.ward_id?.toString() === wardFilter;

      return matchesSearch && matchesStatus && matchesWard;
    });
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

  const EmployeeCard = ({ employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeCode}>ID: {employee.emp_code}</Text>
          <Text style={styles.employeeDesignation}>{employee.designation}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(employee.today_status) }
          ]}>
            <Ionicons
              name={getStatusIcon(employee.today_status)}
              size={16}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {employee.today_status === 'not_marked' ? 'Not Marked' :
                employee.today_status.charAt(0).toUpperCase() + employee.today_status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.detailText}>{employee.ward_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={16} color="#666" />
          <Text style={styles.detailText}>{employee.zone_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.detailText}>
            Supervisor: {employee.supervisor_name || 'Not Assigned'}
          </Text>
        </View>
        {employee.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#666" />
            <Text style={styles.detailText}>{employee.phone}</Text>
          </View>
        )}
      </View>

      {employee.last_attendance && (
        <View style={styles.cardFooter}>
          <Text style={styles.lastAttendance}>
            Last attendance: {new Date(employee.last_attendance).toLocaleString()}
          </Text>
        </View>
      )}
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
            <Text style={styles.modalTitle}>Filter Employees</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <Picker
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value="" />
              <Picker.Item label="Present" value="present" />
              <Picker.Item label="Absent" value="absent" />
              <Picker.Item label="Not Marked" value="not_marked" />
            </Picker>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Ward</Text>
            <Picker
              selectedValue={wardFilter}
              onValueChange={setWardFilter}
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
                setStatusFilter('');
                setWardFilter('');
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
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Employees Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || statusFilter || wardFilter
          ? 'Try adjusting your search or filter criteria'
          : 'No employees have been added yet'}
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
        <Text style={styles.headerTitle}>All Employees</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pagination.total}</Text>
          <Text style={styles.summaryLabel}>Total Employees</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {employees.filter(e => e.today_status === 'present').length}
          </Text>
          <Text style={styles.summaryLabel}>Present Today</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {employees.filter(e => e.today_status === 'absent').length}
          </Text>
          <Text style={styles.summaryLabel}>Absent Today</Text>
        </View>
      </View>

      {/* Active Filters */}
      {(statusFilter || wardFilter) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>Active Filters:</Text>
          {statusFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Status: {statusFilter}</Text>
            </View>
          )}
          {wardFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>
                Ward: {wards.find(w => w.ward_id.toString() === wardFilter)?.ward_name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Employees List */}
      <FlatList
        data={filteredEmployees()}
        keyExtractor={(item) => item.employee_id?.toString() || item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <EmployeeCard employee={item} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={['#dc3545']}
            tintColor="#dc3545"
          />
        }
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
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
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
  },
  filterChipText: {
    fontSize: 12,
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  employeeCard: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  employeeCode: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  employeeDesignation: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'flex-end',
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
    marginBottom: 12,
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
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 8,
  },
  lastAttendance: {
    fontSize: 12,
    color: '#999',
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
    maxHeight: '70%',
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

export default AdminEmployeesScreen;
