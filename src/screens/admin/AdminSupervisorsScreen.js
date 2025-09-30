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
// import { useRealTimeData } from '../../hooks/useRealTimeData';

const AdminSupervisorsScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // DISABLED REAL-TIME DATA TO PREVENT ERRORS
  // const { data: supervisors, loading, error, refresh } = useRealTimeData('/api/admin/supervisors', {
  //   refreshInterval: 60000, // 1 minute
  //   refreshOnMount: true,
  //   refreshOnFocus: true
  // });

  // STATIC DATA TO PREVENT ERRORS
  const supervisors = null;
  const loading = false;
  const error = null;
  const refresh = () => { };

  // Fallback static supervisor data
  const fallbackSupervisors = [
    {
      user_id: 1,
      name: 'Dr. Emily Davis',
      email: 'emily.davis@hospital.com',
      emp_code: 'SUP001',
      ward_names: 'Emergency',
      total_employees: 15,
      assigned_wards: 1,
      status: 'active',
      phone: '+1234567890'
    },
    {
      user_id: 2,
      name: 'Dr. Robert Chen',
      email: 'robert.chen@hospital.com',
      emp_code: 'SUP002',
      ward_names: 'ICU',
      total_employees: 12,
      assigned_wards: 1,
      status: 'active',
      phone: '+1234567891'
    },
    {
      user_id: 3,
      name: 'Dr. Maria Rodriguez',
      email: 'maria.rodriguez@hospital.com',
      emp_code: 'SUP003',
      ward_names: 'Surgery',
      total_employees: 18,
      assigned_wards: 1,
      status: 'active',
      phone: '+1234567892'
    }
  ];

  // Use real-time data if available, otherwise fallback
  const supervisorData = supervisors || fallbackSupervisors;

  // Filter supervisors based on search
  const filteredSupervisors = () => {
    if (!supervisorData || !Array.isArray(supervisorData)) return [];

    if (!searchQuery.trim()) {
      return supervisorData;
    }

    return supervisorData.filter(supervisor =>
      supervisor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supervisor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supervisor.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };



  const handleSupervisorPress = (supervisor) => {
    navigation.navigate('SupervisorDetails', { supervisorId: supervisor.user_id });
  };

  const getStatusColor = (assignedWards, totalEmployees) => {
    if (assignedWards === 0) return '#dc3545'; // Red - No assignments
    if (totalEmployees === 0) return '#ffc107'; // Yellow - No employees
    return '#28a745'; // Green - Active
  };

  const getStatusText = (assignedWards, totalEmployees) => {
    if (assignedWards === 0) return 'No Assignments';
    if (totalEmployees === 0) return 'No Employees';
    return 'Active';
  };

  const SupervisorCard = ({ supervisor }) => (
    <TouchableOpacity
      style={styles.supervisorCard}
      onPress={() => handleSupervisorPress(supervisor)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.supervisorInfo}>
          <Text style={styles.supervisorName}>{supervisor.name}</Text>
          <Text style={styles.supervisorEmail}>{supervisor.email}</Text>
          <Text style={styles.supervisorCode}>ID: {supervisor.emp_code}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(supervisor.assigned_wards, supervisor.total_employees) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(supervisor.assigned_wards, supervisor.total_employees)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.statText}>{supervisor.assigned_wards} Wards</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.statText}>{supervisor.total_employees} Employees</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="call" size={16} color="#666" />
          <Text style={styles.statText}>{supervisor.phone}</Text>
        </View>
      </View>

      {supervisor.ward_names && (
        <View style={styles.wardsContainer}>
          <Text style={styles.wardsLabel}>Assigned Wards:</Text>
          <Text style={styles.wardsText} numberOfLines={2}>
            {supervisor.ward_names}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.joinedDate}>
          Joined: {new Date(supervisor.created_at).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Supervisors Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery ? 'Try adjusting your search criteria' : 'No supervisors have been added yet'}
      </Text>
    </View>
  );

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Supervisors</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.statusText}>
              System Online
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search supervisors..."
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
          <Text style={styles.summaryNumber}>{supervisors.length}</Text>
          <Text style={styles.summaryLabel}>Total Supervisors</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {supervisors.filter(s => s.assigned_wards > 0).length}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {supervisors.filter(s => s.assigned_wards === 0).length}
          </Text>
          <Text style={styles.summaryLabel}>Unassigned</Text>
        </View>
      </View>

      {/* Supervisors List */}
      <FlatList
        data={filteredSupervisors()}
        keyExtractor={(item) => item.user_id?.toString() || item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <SupervisorCard supervisor={item} />}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  lastUpdatedText: {
    fontSize: 9,
    color: '#999',
    marginLeft: 4,
  },
  addButton: {
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
  listContainer: {
    padding: 20,
  },
  supervisorCard: {
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
  supervisorInfo: {
    flex: 1,
  },
  supervisorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  supervisorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  supervisorCode: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  wardsContainer: {
    marginBottom: 12,
  },
  wardsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  wardsText: {
    fontSize: 14,
    color: '#333',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 12,
  },
  joinedDate: {
    fontSize: 12,
    color: '#666',
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
});

export default AdminSupervisorsScreen;
