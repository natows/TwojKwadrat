'use client';

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { useKeycloak } from '@react-keycloak/web';

const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

interface Amenity {
  id: string;
  label: string;
}

interface PostFormValues {
  title: string;
  price: string | number;
  size: string | number;
  street: string;     
  city: string;       
  district: string;   
  description: string;
  availableFrom: string | Date;
  minRentalPeriod: number; 
  amenities: string[];
  roommates: number;
  email: string;
  phone: string;
  images: File[];
}

const PostSchema = Yup.object().shape({
  title: Yup.string()
    .min(5, 'Tytuł jest za krótki')
    .max(100, 'Tytuł jest za długi')
    .required('Tytuł jest wymagany'),
  price: Yup.number()
    .positive('Cena musi być dodatnia')
    .required('Cena jest wymagana'),
  size: Yup.number()
    .positive('Wielkość pokoju musi być dodatnia')
    .required('Wielkość pokoju jest wymagana'),
  street: Yup.string()
    .required('Ulica jest wymagana'),
  city: Yup.string()
    .required('Miasto jest wymagane'),
  district: Yup.string()
    .required('Dzielnica jest wymagana'),
  description: Yup.string()
    .min(20, 'Opis jest za krótki')
    .max(2000, 'Opis jest za długi')
    .required('Opis jest wymagany'),
  availableFrom: Yup.date()
  .min(getTodayDate(), 'Data dostępności nie może być wcześniejsza niż dzisiaj')
  .required('Data dostępności jest wymagana'),
  minRentalPeriod: Yup.number()
    .min(1, 'Minimalny okres wynajmu musi wynosić co najmniej 1 miesiąc')
    .max(24, 'Minimalny okres wynajmu nie może przekraczać 24 miesięcy')
    .integer('Okres wynajmu musi być liczbą całkowitą')
    .required('Minimalny okres wynajmu jest wymagany'),
  roommates: Yup.number()
    .min(0, 'Liczba współlokatorów nie może być ujemna')
    .integer('Liczba współlokatorów musi być liczbą całkowitą'),
  email: Yup.string()
    .email('Niepoprawny format adresu email')
    .required('Email jest wymagany'),
  phone: Yup.string()
    .matches(/^[0-9]{9}$/, 'Numer telefonu musi zawierać 9 cyfr')
    .required('Numer telefonu jest wymagany'), 
});

const amenities: Amenity[] = [
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'Pralka', label: 'Pralka' },
  { id: 'Zmywarka', label: 'Zmywarka' },
  { id: 'Parking', label: 'Miejsce parkingowe' },
  { id: 'Siłownia', label: 'Siłownia' },
  { id: 'Balkon', label: 'Balkon' },
  { id: 'Umeblowane', label: 'Umeblowane' },
  { id: 'Zwierzęta', label: 'Zwierzęta dozwolone' },
  { id: 'Palenie dozwolone', label: 'Palenie dozwolone' },
  { id: 'Klimatyzacja', label: 'Klimatyzacja' },
];

export default function CreatePostPage() {
  const {keycloak, initialized} = useKeycloak();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (values: PostFormValues, { setSubmitting, resetForm }: FormikHelpers<PostFormValues>) => {
  setIsSubmitting(true);
  setSubmitError('');

  console.log('Keycloak authenticated:', keycloak.authenticated);
  console.log('Keycloak initialized:', initialized);
  console.log('Token exists:', !!keycloak.token);
  console.log('Token length:', keycloak.token?.length || 0);
  
  if (keycloak.token) {
    console.log('Token (first 50 chars):', keycloak.token.substring(0, 50) + '...');
    console.log('Token expired:', keycloak.isTokenExpired());
    
    try {
      const tokenParts = keycloak.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
      
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }
  if (!keycloak.authenticated) {
    setSubmitError('Musisz być zalogowany aby dodać ogłoszenie');
    setIsSubmitting(false);
    return;
  }
  
  if (!keycloak.token) {
    setSubmitError('Brak tokenu autoryzacji');
    setIsSubmitting(false);
    return;
  }
  
  if (keycloak.isTokenExpired()) {
    console.log('Token expired, attempting to refresh...');
    try {
      const refreshed = await keycloak.updateToken(30);
      console.log('Token refreshed successfully:', refreshed);
      console.log('New token (first 50 chars):', keycloak.token?.substring(0, 50) + '...');
    } catch (error) {
      console.error('Token refresh failed:', error);
      setSubmitError('Token wygasł, zaloguj się ponownie');
      keycloak.logout();
      return;
    }
  }
    try {
      const dataToSend = {
        title: values.title,
        price: parseFloat(values.price.toString()),
        size: parseInt(values.size.toString()),
        street: values.street,
        city: values.city,
        district: values.district,
        description: values.description,
        available_from: values.availableFrom.toString(),
        min_rental_period: parseInt(values.minRentalPeriod.toString()), 
        amenities: Array.isArray(values.amenities) ? values.amenities.join(',') : '',
        roommates: parseInt(values.roommates.toString()) || 0,
        email: values.email,
        phone: values.phone
      };

      console.log('Sending data:', dataToSend);
        
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`, 
          'Content-Type': 'application/json',


        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Błąd podczas dodawania ogłoszenia: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Success:', result);

      resetForm();
      router.push('/');
      router.refresh();
    } catch (error: any) { 
      console.error('Błąd podczas wysyłania formularza:', error);
      setSubmitError(error.message || 'Wystąpił błąd podczas dodawania ogłoszenia.');
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Dodaj ogłoszenie o pokoju na wynajem</h1>
      
      {submitError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{submitError}</p>
        </div>
      )}
      
      <Formik
        initialValues={{
          title: '',
          price: '',
          size: '',
          street: '',      
          city: '',       
          district: '',   
          description: '',
          availableFrom: '',
          minRentalPeriod: 1, 
          amenities: [],
          roommates: 0,
          email: '',
          phone: '',
          images: [],
        } as unknown as PostFormValues}
        validationSchema={PostSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <Form className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Tytuł ogłoszenia</label>
              <Field
                type="text"
                name="title"
                id="title"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="np. Przytulny pokój w centrum Warszawy"
              />
              <ErrorMessage name="title" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Cena miesięczna (PLN)</label>
                <Field
                  type="number"
                  name="price"
                  id="price"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="1200"
                />
                <ErrorMessage name="price" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700">Wielkość pokoju (m²)</label>
                <Field
                  type="number"
                  name="size"
                  id="size"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="15"
                />
                <ErrorMessage name="size" component="div" className="text-red-500 text-sm mt-1" />
              </div>
            </div>

            <div>
              <h3 className="block text-sm font-medium text-gray-700 mb-2">Lokalizacja</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">Ulica i numer</label>
                  <Field
                    type="text"
                    name="street"
                    id="street"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ul. Przykładowa 12"
                  />
                  <ErrorMessage name="street" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">Miasto</label>
                  <Field
                    type="text"
                    name="city"
                    id="city"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Warszawa"
                  />
                  <ErrorMessage name="city" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700">Dzielnica</label>
                  <Field
                    type="text"
                    name="district"
                    id="district"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Mokotów"
                  />
                  <ErrorMessage name="district" component="div" className="text-red-500 text-sm mt-1" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Opis</label>
              <Field
                as="textarea"
                name="description"
                id="description"
                rows={5}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Opisz pokój, mieszkanie, okolicę i współlokatorów..."
              />
              <ErrorMessage name="description" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700">Dostępne od</label>
                <Field
                  type="date"
                  name="availableFrom"
                  id="availableFrom"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <ErrorMessage name="availableFrom" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              
              <div>
                <label htmlFor="minRentalPeriod" className="block text-sm font-medium text-gray-700">
                  Minimalny okres wynajmu (miesiące)
                </label>
                <Field
                  type="number"
                  name="minRentalPeriod"
                  id="minRentalPeriod"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  min="1"
                  max="24"
                  placeholder="3"
                />
                <ErrorMessage name="minRentalPeriod" component="div" className="text-red-500 text-sm mt-1" />
                <p className="text-sm text-gray-500 mt-1">
                  Określ minimalny okres na jaki chcesz wynająć pokój
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Udogodnienia</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <FieldArray name="amenities">
                  {({ push, remove }) => (
                    <>
                      {amenities.map((amenity: Amenity) => (
                        <div key={amenity.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={amenity.id}
                            checked={values.amenities.includes(amenity.id)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.checked) {
                                push(amenity.id);
                              } else {
                                const idx = values.amenities.indexOf(amenity.id);
                                if (idx !== -1) remove(idx);
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={amenity.id} className="ml-2 block text-sm text-gray-700">
                            {amenity.label}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </FieldArray>
              </div>
            </div>

            <div>
              <label htmlFor="roommates" className="block text-sm font-medium text-gray-700">Liczba współlokatorów</label>
              <Field
                type="number"
                name="roommates"
                id="roommates"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                min="0"
              />
              <ErrorMessage name="roommates" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email kontaktowy</label>
                <Field
                  type="email"
                  name="email"
                  id="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="twoj.email@example.com"
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefon kontaktowy</label>
                <Field
                  type="tel"
                  name="phone"
                  id="phone"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="123456789"
                />
                <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zdjęcia</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Dodaj zdjęcia</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        multiple
                        className="sr-only"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.files) {
                            setFieldValue('images', Array.from(e.target.files));
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">lub przeciągnij i upuść</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF do 10MB</p>
                </div>
              </div>
              {values.images.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{values.images.length} plik(i) wybrane</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isSubmitting ? 'Dodawanie...' : 'Dodaj ogłoszenie'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}