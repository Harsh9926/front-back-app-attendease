import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';

const FACE_IMAGE_KEYS = [
  'face_image_url',
  'faceImageUrl',
  'face_url',
  'faceUrl',
  'face_photo',
  'facePhoto',
  'faceEnrollmentUrl',
];

const toAbsoluteUrl = (value) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = API_CONFIG?.BASE_URL || '';
  if (!baseUrl) {
    return value;
  }

  const sanitisedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const sanitisedPath = value.startsWith('/') ? value.slice(1) : value;
  return `${sanitisedBase}/${sanitisedPath}`;
};

const extractFaceImage = (employee) => {
  for (const key of FACE_IMAGE_KEYS) {
    const value = employee?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return toAbsoluteUrl(value.trim());
    }
  }
  return null;
};

const FaceGalleryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const supervisorId = user?.user_id ?? user?.id ?? user?.userId ?? null;
      const { success, data, message } = await apiService.getSupervisorEmployees(supervisorId);

      if (!success) {
        console.warn('FaceGalleryScreen: getSupervisorEmployees returned success=false', message);
        setGallery([]);
        return;
      }

      const wards = (data || []).map(ward => {
        const employeesWithImages = (ward.employees || [])
          .map(employee => {
            const imageUrl = extractFaceImage(employee);
            if (!imageUrl) {
              return null;
            }

            return {
              id: employee?.emp_id ?? employee?.empId ?? employee?.id ?? employee?.emp_code ?? String(Math.random()),
              name: employee?.emp_name || 'Employee',
              designation: employee?.designation || 'Staff',
              code: employee?.emp_code || employee?.employee_code || 'NA',
              wardName: ward?.ward_name || 'Ward',
              imageUrl,
            };
          })
          .filter(Boolean);

        return {
          wardId: ward?.ward_id ?? ward?.id ?? Math.random().toString(36).slice(2),
          wardName: ward?.ward_name || 'Ward',
          employees: employeesWithImages,
        };
      }).filter(ward => ward.employees.length > 0);

      setGallery(wards);
    } catch (error) {
      console.error('FaceGalleryScreen: fetchGallery failed', error);
      setGallery([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGallery();
    setRefreshing(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.centerText}>Loading face gallery...</Text>
        </View>
      );
    }

    if (gallery.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="image-outline" size={48} color="#9aa5b1" />
          <Text style={styles.centerTitle}>No face images found</Text>
          <Text style={styles.centerSubtitle}>
            Ask your team to upload their face images so you can review them here.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.galleryContainer}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007bff" />
        )}
      >
        {gallery.map(ward => (
          <View key={ward.wardId} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{ward.wardName}</Text>
                <Text style={styles.sectionSubtitle}>
                  {ward.employees.length} employee{ward.employees.length === 1 ? '' : 's'}
                </Text>
              </View>
              <Ionicons name="images-outline" size={20} color="#3f51b5" />
            </View>

            <View style={styles.imageGrid}>
              {ward.employees.map(employee => (
                <TouchableOpacity
                  key={employee.id}
                  style={styles.imageCard}
                  activeOpacity={0.85}
                  onPress={() => setSelected(employee)}
                >
                  <Image source={{ uri: employee.imageUrl }} style={styles.imageThumb} />
                  <View style={styles.imageMeta}>
                    <Text style={styles.imageName} numberOfLines={1}>{employee.name}</Text>
                    <Text style={styles.imageDetails} numberOfLines={1}>
                      {employee.designation} • ID: {employee.code}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2933" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Face Gallery</Text>
          <Text style={styles.headerSubtitle}>Review the latest face uploads from your team</Text>
        </View>
        <TouchableOpacity onPress={fetchGallery} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#1f2933" />
        </TouchableOpacity>
      </View>

      {renderContent()}

      <Modal
        visible={!!selected}
        animationType="fade"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={24} color="#1f2933" />
            </TouchableOpacity>
            {selected && (
              <>
                <Image source={{ uri: selected.imageUrl }} style={styles.modalImage} />
                <Text style={styles.modalName}>{selected.name}</Text>
                <Text style={styles.modalDetails}>{selected.designation}</Text>
                <Text style={styles.modalDetails}>Employee ID: {selected.code}</Text>
                <Text style={styles.modalDetails}>Ward: {selected.wardName}</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    width: '48%',
    borderRadius: 14,
    backgroundColor: '#f8f9ff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  imageThumb: {
    width: '100%',
    height: 140,
    backgroundColor: '#c7d2fe',
  },
  imageMeta: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
  },
  imageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  imageDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2933',
  },
  centerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  modalClose: {
    alignSelf: 'flex-end',
  },
  modalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
  },
  modalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
    marginTop: 8,
  },
  modalDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default FaceGalleryScreen;
