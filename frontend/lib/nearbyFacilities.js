// Nearby Facilities Helper Functions
// Uses Google Places API to find nearby emergency facilities

// Find nearby facilities using Google Places API
export const findNearbyFacilities = async (latitude, longitude, type) => {
  try {
    // Type mapping for Google Places API
    const typeMap = {
      hospital: 'hospital',
      fire_station: 'fire_station',
      police: 'police'
    };

    const placeType = typeMap[type] || type;
    
    // Use Google Places Nearby Search API
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    return new Promise((resolve, reject) => {
      const request = {
        location: new google.maps.LatLng(latitude, longitude),
        rankBy: google.maps.places.RankBy.DISTANCE,
        type: placeType
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          // Get top 5 closest facilities
          const facilities = results.slice(0, 5).map(place => ({
            name: place.name,
            address: place.vicinity,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            distance: calculateDistance(
              latitude,
              longitude,
              place.geometry.location.lat(),
              place.geometry.location.lng()
            ),
            placeId: place.place_id,
            rating: place.rating,
            isOpen: place.opening_hours?.isOpen()
          }));
          
          resolve(facilities);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Error finding nearby facilities:', error);
    return [];
  }
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // in km
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Format distance for display
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

// Get directions URL
export const getDirectionsUrl = (fromLat, fromLng, toLat, toLng) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
};

// Get facility type icon and color
export const getFacilityConfig = (type) => {
  const configs = {
    hospital: { icon: '🏥', color: '#3b82f6', label: 'Hospitals' },
    fire_station: { icon: '🚒', color: '#ef4444', label: 'Fire Stations' },
    police: { icon: '🚔', color: '#8b5cf6', label: 'Police Stations' }
  };
  
  return configs[type] || { icon: '📍', color: '#64748b', label: 'Facilities' };
};
