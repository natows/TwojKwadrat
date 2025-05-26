'use client';
import React from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { useEffect, useState } from 'react';

interface UserData {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    first_name?: string;
    last_name?: string;
}

export default function UserPage() {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const { keycloak, initialized } = useKeycloak();

    useEffect(() => {
        if (!initialized) {
            return;
        }
        if (!keycloak.authenticated) {
            keycloak.login();
            return;
        }
        
        const fetchUserData = async () => {
            try {
                const res = await fetch(`/api/users/${keycloak.tokenParsed?.sub}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${keycloak.token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!res.ok) {
                    throw new Error(`Error fetching user data: ${res.status}`);
                }
                const data = await res.json();
                console.log("Fetched user data:", data);
                setUserData(data);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserData();
    }, [initialized, keycloak.authenticated, keycloak.tokenParsed?.sub, keycloak.token]);

    if (loading) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
                Profil użytkownika
            </h1>
            
            {userData ? (
                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <label className="text-sm text-gray-600 font-medium">Username:</label>
                        <p className="text-gray-800">{userData.username}</p>
                    </div>
                    
                    <div className="border-b pb-2">
                        <label className="text-sm text-gray-600 font-medium">Email:</label>
                        <p className="text-gray-800">{userData.email || 'Nie podano' } </p>
                    </div>
                    
                    <div className="border-b pb-2">
                        <label className="text-sm text-gray-600 font-medium">Imię:</label>
                        <p className="text-gray-800">{userData.firstName || userData.first_name || 'Nie podano'}</p>
                    </div>
                    
                    <div>
                        <label className="text-sm text-gray-600 font-medium">Nazwisko:</label>
                        <p className="text-gray-800">{userData.lastName || userData.last_name || 'Nie podano'}</p>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-600">
                    Nie udało się załadować danych użytkownika
                </div>
            )}
        </div>
    );
}