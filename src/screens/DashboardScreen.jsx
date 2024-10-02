import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, Image, ActivityIndicator, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';

function DashboardScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [longPressIndex, setLongPressIndex] = useState(null); // Track the index of the long-pressed photo

  // Define fetchPhotos function
  const fetchPhotos = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      Alert.alert('Error', 'User is not authenticated. Please log in again.');
      navigation.navigate('Login');
      return;
    }

    try {
      const response = await axios.get('https://photo-gallery-app-production.up.railway.app/api/photos/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setPhotos(response.data);
      } else {
        Alert.alert('Error', 'Failed to fetch photos.');
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      Alert.alert('Error', 'Something went wrong while fetching photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleLogout = () => {
    navigation.navigate('Login');
  };

  const handlePhotoUpload = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'User is not authenticated. Please log in again.');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 0,
      },
      async (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
        } else {
          const formData = new FormData();
          response.assets.forEach((asset) => {
            formData.append('photos', {
              uri: asset.uri,
              type: asset.type,
              name: asset.fileName || 'photo.jpg',
            });
          });

          try {
            const apiResponse = await axios.post(
              'https://photo-gallery-app-production.up.railway.app/api/photos/upload',
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data',
                },
              }
            );

            if (apiResponse.status === 201) {
              Alert.alert('Success', apiResponse.data.message);
              fetchPhotos(); // Call the function directly
            } else {
              Alert.alert('Upload Failed', apiResponse.data.error);
            }
          } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Something went wrong during upload.');
          }
        }
      }
    );
  };

  const handlePhotoClick = (item) => {
    setSelectedPhoto(item);
    setModalVisible(true);
  };

  const showDeleteConfirmation = (item) => {
    setPhotoToDelete(item);
    setDeleteModalVisible(true);
  };

  const deletePhoto = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      Alert.alert('Error', 'User is not authenticated. Please log in again.');
      return;
    }

    try {
      const response = await axios.delete(`https://photo-gallery-app-production.up.railway.app/api/photos/${photoToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        Alert.alert('Success', response.data.message);
        fetchPhotos(); // Call the function directly
      }
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', error.response ? error.response.data.error : 'Something went wrong while deleting the photo.');
    } finally {
      setDeleteModalVisible(false);
      setPhotoToDelete(null);
      setLongPressIndex(null); // Reset long press index
    }
  };

  const renderPhotoCard = ({ item, index }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => handlePhotoClick(item)} onLongPress={() => setLongPressIndex(index)}>
        <Image
          source={{ uri: `https://photo-gallery-app-production.up.railway.app/uploads/${item.filename}` }}
          style={styles.photo}
        />
        <Text style={styles.photoName}>Photo ID: {item.id}</Text>
      </TouchableOpacity>
      {longPressIndex === index && ( // Show three dots only when the photo is long-pressed
        <TouchableOpacity onPress={() => showDeleteConfirmation(item)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#4A90E2" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.welcomeText}>Welcome to your dashboard!</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={photos}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPhotoCard}
          contentContainerStyle={styles.photoList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Photo Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: `https://photo-gallery-app-production.up.railway.app/uploads/${selectedPhoto.filename}` }}
              style={styles.modalImage}
            />
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationText}>Are you sure you want to delete this photo?</Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deletePhoto} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Menu */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity onPress={() => console.log('Home Pressed')} style={styles.menuButton}>
          <Ionicons name="home-outline" size={24} color="black" />
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePhotoUpload} style={styles.menuButton}>
          <Ionicons name="cloud-upload-outline" size={24} color="black" />
          <Text style={styles.menuText}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.menuButton}>
          <Ionicons name="log-out-outline" size={24} color="black" />
          <Text style={styles.menuText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 20,
  },
  photoList: {
    paddingBottom: 80, // Space for bottom menu
  },
  card: {
    margin: 5,
    width: '45%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 3,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoName: {
    fontSize: 14,
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalClose: {
    position: 'absolute',
    top: 30,
    right: 20,
  },
  modalImage: {
    width: '90%',
    height: '90%',
    borderRadius: 10,
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    height: 60,
    elevation: 5,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  menuButton: {
    alignItems: 'center',
  },
  menuText: {
    fontSize: 12,
    color: 'black',
  },
  confirmationBox: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
  },
  confirmationText: {
    fontSize: 16,
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: 'black',
  },
  confirmButtonText: {
    color: 'white',
  },
});

export default DashboardScreen;
