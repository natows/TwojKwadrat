'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Post {
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
  author_id: string;
  author_username: string;
  images?: { id: number, image_url: string }[];  
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("useEffect triggered, params.id:", params.id);
    
    const fetchPost = async () => {
      try {
        setLoading(true);
        const url = `/api/get/${params.id}`;
        console.log("About to fetch from URL:", url);
        
        const res = await fetch(url);
        console.log("Fetch response received:", res);
        console.log("Fetch completed, status:", res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error response:", errorText);
          throw new Error(`Post nie został znaleziony (${res.status})`);
        }
        
        const postData = await res.json();
        console.log("Post data parsed:", postData);
        
        setPost(postData);
        
      } catch (error: any) {
        console.error("Fetch error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

  if (params.id) {
    console.log("params.id exists, calling fetchPost");
    fetchPost();
  } else {
    console.log("params.id is missing");
  }
}, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Ładowanie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-lg text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Wróć do strony głównej
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Post nie został znaleziony</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← Wróć
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{post.title}</h1>
        <p className="text-gray-600 mt-2">
          Opublikowane przez: <span className="font-semibold">{post.author_username}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Podstawowe informacje</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Cena:</span>
                <p className="text-2xl font-bold text-green-600">{post.price} PLN/miesiąc</p>
              </div>
              <div>
                <span className="font-medium">Rozmiar:</span>
                <p className="text-lg">{post.size} m²</p>
              </div>
              <div>
                <span className="font-medium">Dostępne od:</span>
                <p>{new Date(post.available_from).toLocaleDateString('pl-PL')}</p>
              </div>
              <div>
                <span className="font-medium">Min. okres wynajmu:</span>
                <p>{post.min_rental_period} {post.min_rental_period === 1 ? 'miesiąc' : 'miesięcy'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Lokalizacja</h2>
            <p className="text-lg">
              {post.street}, {post.district}, {post.city}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Opis</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {post.description}
            </p>
          </div>
          {post.amenities && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Udogodnienia</h2>
              <div className="flex flex-wrap gap-2">
                {post.amenities.split(',').map((amenity, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {amenity.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          {post.roommates > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Współlokatorzy</h2>
              <p>Liczba współlokatorów: {post.roommates}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
            <div className="space-y-4">
              <div>
                <span className="font-medium block mb-1">Email:</span>
                <a 
                  href={`mailto:${post.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {post.email}
                </a>
              </div>
              <div>
                <span className="font-medium block mb-1">Telefon:</span>
                <a 
                  href={`tel:${post.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {post.phone}
                </a>
              </div>
              <div className="pt-4 space-y-2">
                <a 
                  href={`mailto:${post.email}?subject=Zapytanie o: ${post.title}`}
                  className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors block text-center"
                >
                  Wyślij email
                </a>
                <a 
                  href={`tel:${post.phone}`}
                  className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors block text-center"
                >
                  Zadzwoń
                </a>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <p>Ogłoszenie dodane: {new Date(post.created_at).toLocaleDateString('pl-PL')}</p>
            {post.updated_at !== post.created_at && (
              <p>Ostatnia aktualizacja: {new Date(post.updated_at).toLocaleDateString('pl-PL')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}