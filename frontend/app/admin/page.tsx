'use client';
import { useKeycloak } from '@react-keycloak/web';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    realm_id: string;
}
export default function AdminPanel() {
    const {keycloak, initialized} = useKeycloak();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState([]);


    useEffect(() => {
        if (initialized && !keycloak.authenticated) {
            keycloak.login();
        }
    },[initialized, keycloak.authenticated]);

    useEffect(() => {
        if (initialized && keycloak.authenticated) {
            console.log("Sprawdzam uprawnienia administratora");
            if (keycloak.tokenParsed) {
                const hasRole = keycloak.hasRealmRole('admin');
                console.log("Czy użytkownik ma rolę admin:", hasRole);
                
                if (!hasRole) {
                    console.log("Brak uprawnień administratora, przekierowuję");
                    router.push('/');
                    return;
                }
                
                setIsAdmin(true);
                setLoading(false);
            } else {
                console.log("Token nie jest jeszcze załadowany");
                keycloak.updateToken(30).then(() => {
                    console.log("Token odświeżony");
                });
            }
        }
    }, [initialized, keycloak.authenticated, keycloak.tokenParsed]);

    useEffect(() => {
        if (isAdmin) {
            const fetchUsers = async () => {
                try {
                    const res = await fetch("/api/users/", {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${keycloak.token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    const users = await res.json();
                    setUsers(users);
                    console.log("Fetched users:", users);
                } catch (error) {
                    console.error("Error fetching users:", error);
                }
                
            }
            fetchUsers();
        }
        
    }, [isAdmin]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <h1 className="text-4xl font-bold">Sprawdzanie uprawnień...</h1>
            </div>
        )
    }
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold">Panel administracyjny</h1>
            <p className="mt-4">Tutaj możesz zarządzać swoimi danymi.</p>
            <div className="mt-8">
                <h2 className="text-2xl font-semibold">Lista użytkowników</h2>
                <ul className="mt-4">
                    {users.map((user: User) => (
                        <li key={user.id} className="p-4 border-b">
                            <h3 className="text-xl font-semibold">{user.username}</h3>
                            <p>{user.email}</p>
                        </li>
                    ))}{/* jeden admin to prawdopodobnie ja albo jakis od mastera */}
                </ul>
                {users.length === 0 && (
                    <p className="text-lg">Brak użytkowników.</p>
                )}
            </div>  
        </div>
        
    );
}