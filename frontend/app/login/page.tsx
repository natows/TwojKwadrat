'use client';
import { useRouter } from 'next/navigation';
import { useKeycloak } from '@react-keycloak/web';
import { useEffect } from 'react';
export default function LoginPage() {
    const router = useRouter();
    const {keycloak, initialized } = useKeycloak();

    useEffect(() => {
        console.log('Keycloak initialized:', initialized);
        console.log('Keycloak authenticated:', keycloak?.authenticated);
        console.log('Keycloak object:', keycloak);
    }, [initialized, keycloak]);

    useEffect(() => {
        if (initialized && keycloak.authenticated) {
            router.push('/');
        }
    }, [initialized, keycloak.authenticated, router]);


    const handleLogin = () => {
        keycloak.login();
    };

    const handleRegister = () => {
        keycloak.register();
    };

    if (!initialized) {
        return <div>Loading...</div>;
    }

    if (!keycloak.authenticated) {
        return (
            <>
            <button onClick={handleLogin}>Zaloguj się</button>
            <button onClick={handleRegister}>Zarejestruj się</button>
            </>
        )
    }


}