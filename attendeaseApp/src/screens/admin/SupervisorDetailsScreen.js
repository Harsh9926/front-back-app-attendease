import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { apiService } from '../../services/apiService';

const { width } = Dimensions.get('window');

const SupervisorDetailsScreen = ({ route, navigation }) => {
  const { supervisorId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supervisorData, setSupervisorData] = useState({
    supervisor: {},
    assignments: [],
    recentActivity: []
  });

  useEffect(() => {
    loadSupervisorDetails();
  }, []);

  const loadSupervisorDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/admin/supervisors/${supervisorId}`);
      setSupervisorData(response.data);
    } catch (error) {
      console.error('Load supervisor details error:', error);
      Alert.alert('Error', 'Failed to load supervisor details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSupervisorDetails();
    setRefreshing(false);
  };

  const handleEditAssignments = () => {
    Alert.alert(
      'Edit Assignments',
      'Ward assignment editing will be available in the next update.',
      [{ text: 'OK' }]
    );
  };

  const renderActivityChart = () => {
    if (!supervisorData.recentActivity || supervisorData.recentActivity.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No recent activity data</Text>
        </View>
      );
    }

    const chartData = {
      labels: supervisorData.recentActivity.slice(-7).map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: supervisorData.recentActivity.slice(-7).map(item => item.present_count || 0),
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    return (
      <LineChart
        data={chartData}
        width={width - 40}
        height={180}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '3',
            strokeWidth: '2',
            stroke: '#28a745'
          }
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading supervisor details...</Text>
      </View>
    );
  }

  const { supervisor, assignments } = supervisorData;
  const totalEmployees = assignments.reduce((sum, ward) => sum + ward.employee_count, 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supervisor Details</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* Supervisor Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {supervisor.name ? supervisor.name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
        </View>
        <View style={styles.supervisorInfo}>
          <Text style={styles.supervisorName}>{supervisor.name}</Text>
          <Text style={styles.supervisorEmail}>{supervisor.email}</Text>
          <Text style={styles.supervisorCode}>Employee ID: {supervisor.emp_code}</Text>
          <Text style={styles.supervisorPhone}>Phone: {supervisor.phone}</Text>
          <Text style={styles.joinedDate}>
            Joined: {new Date(supervisor.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{assignments.length}</Text>
          <Text style={styles.statLabel}>Assigned Wards</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalEmployees}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {supervisorData.recentActivity.length}
          </Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>
      </View>

      {/* Ward Assignments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ward Assignments</Text>
          <TouchableOpacity style={styles.editAssignmentsButton} onPress={handleEditAssignments}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        {assignments.length > 0 ? (
          assignments.map((ward, index) => (
            <View key={index} style={styles.wardCard}>
              <View style={styles.wardInfo}>
                <Text style={styles.wardName}>{ward.ward_name}</Text>
                <Text style={styles.zoneName}>{ward.zone_name}</Text>
              </View>
              <View style={styles.wardStats}>
                <View style={styles.employeeCount}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={styles.employeeCountText}>{ward.employee_count}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noAssignments}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.noAssignmentsText}>No ward assignments</Text>
            <TouchableOpacity style={styles.assignButton} onPress={handleEditAssignments}>
              <Text style={styles.assignButtonText}>Assign Wards</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent Activity Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity (7 Days)</Text>
        <View style={styles.chartContainer}>
          {renderActivityChart()}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="call" size={20} color="#007bff" />
          <Text style={styles.actionButtonText}>Call Supervisor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="mail" size={20} color="#007bff" />
          <Text style={styles.actionButtonText}>Send Email</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  editButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  supervisorInfo: {
    alignItems: 'center',
  },
  supervisorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  supervisorEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  supervisorCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  supervisorPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  joinedDate: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editAssignmentsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  wardCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wardInfo: {
    flex: 1,
  },
  wardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  zoneName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  wardStats: {
    alignItems: 'flex-end',
  },
  employeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  noAssignments: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noAssignmentsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  assignButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  chartPlaceholder: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  actionButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SupervisorDetailsScreen;
