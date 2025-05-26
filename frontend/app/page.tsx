'use client';
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useKeycloak } from '@react-keycloak/web';

interface Room {
  id: number;
  title: string;
  price: number;
  size: number;
  street: string;
  city: string; 
  district: string;
  created_at: string;
  updated_at: string;
  description: string;
  available_from: string;
  min_rental_period: number; 
  amenities: string;
  roommates: number;
  email: string;
  phone: string;
  images?: { id: number, image_url: string }[]; 
  author_id: number; 
  author_username?: string;
}

export default function Home() {
  const { keycloak } = useKeycloak();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filters, setFilters] = useState({
    city: "",
    district: "",
    minPrice: 0,
    maxPrice: 10000,
    roommates: 0,
    title: ""
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city.trim()) params.append('city', filters.city);
      if (filters.district.trim()) params.append('district', filters.district);
      if (filters.minPrice > 0) params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice < 10000) params.append('max_price', filters.maxPrice.toString());
      if (filters.roommates > 0) params.append('roommates', filters.roommates.toString());  
      if (filters.title.trim()) params.append('title', filters.title);    
      
      const res = await fetch(`api/posts/?${params.toString()}`);
      const rooms = await res.json();
      setRooms(rooms);
      console.log("Fetched filtered rooms:", rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRooms();
    }, 500); 

    return () => clearTimeout(timeoutId);
  }, [fetchRooms]);

  const clearFilters = () => {
    setFilters({
      city: "",
      district: "",
      minPrice: 0,
      maxPrice: 10000,
      roommates: 0,
      title: ""
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== "" && value !== 0 && value !== 10000
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-gradient-to-r from-blue-300 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              Znajdź swój idealny pokój
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-blue-100">
              Tysiące (narazie nie) ofert pokoi do wynajęcia w całej Polsce
            </p>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="search"
                      placeholder="Szukaj pokoi..."
                      value={filters.title}
                      onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Miasto"
                      value={filters.city}
                      onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtry
                    {activeFiltersCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white shadow-lg border-t">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dzielnica</label>
                <input
                  type="text"
                  placeholder="np. Mokotów"
                  value={filters.district}
                  onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cena min (PLN)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cena max (PLN)</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={filters.maxPrice === 10000 ? '' : filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 10000 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max współlokatorów</label>
                <input
                  type="number"
                  placeholder="Bez limitu"
                  value={filters.roommates || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, roommates: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Wyczyść filtry
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Zastosuj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{Array.isArray(rooms) ? rooms.length : 0}</div>
            <div className="text-gray-600">Dostępnych pokoi</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {Array.isArray(rooms) && rooms.length > 0 
                ? Math.min(...rooms.map(r => r.price)) 
                : 0} PLN
            </div>
            <div className="text-gray-600">Najniższa cena</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {Array.isArray(rooms) 
                ? new Set(rooms.map(r => r.city)).size 
                : 0}
            </div>
            <div className="text-gray-600">Miast</div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {loading ? 'Wyszukiwanie...' : `Znalezione pokoje (${Array.isArray(rooms) ? rooms.length : 0})`}
          </h2>

        </div>
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
          <>
            {Array.isArray(rooms) && rooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rooms.map((room) => (
                  <Link 
                    key={room.id} 
                    href={`/posts/${room.id}`}  
                    className="group block"
                  >
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group-hover:-translate-y-1">
                      {/* Image placeholder */}
                      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <div className="absolute top-4 right-4">
                          <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                            {room.size} m²
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-lg font-bold">
                            {room.price} PLN
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {room.title}
                        </h3>
                        
                        <div className="flex items-center text-gray-600 mb-3">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">{room.district}, {room.city}</span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {room.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {room.roommates > 0 && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                {room.roommates}
                              </div>
                            )}
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8h0m-6-4v10a2 2 0 002 2h8a2 2 0 002-2V11a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                              </svg>
                              {room.min_rental_period}m
                            </div>
                          </div>
                          
                          {room.author_username && (
                            <div className="text-xs text-gray-400">
                              {room.author_username}
                            </div>
                          )}
                        </div>

                        {room.amenities && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {room.amenities.split(',').slice(0, 3).map((amenity, index) => (
                              <span 
                                key={index}
                                className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                              >
                                {amenity.trim()}
                              </span>
                            ))}
                            {room.amenities.split(',').length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{room.amenities.split(',').length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Nie znaleźliśmy pokoi spełniających twoje kryteria
                </h3>
                <p className="text-gray-600 mb-6">
                  Spróbuj zmienić filtry wyszukiwania lub sprawdź inne miasta
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Wyczyść filtry
                  </button>
                  {keycloak.authenticated && (
                    <Link
                      href="/create_post"
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Dodaj pierwsze ogłoszenie
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}