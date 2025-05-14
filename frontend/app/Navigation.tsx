'use client'
import { useKeycloak } from '@react-keycloak/web';
export default function Navigation() {
    const { keycloak} = useKeycloak();

    const handleLogout = () => {
        keycloak.logout();
    }

    return (
        <nav className="flex items-center justify-between p-4 bg-gray-800 text-white">
            <div className="text-lg font-bold">Twoj Kwadrat</div>
            <ul className="flex space-x-4">
                <li>
                    <a href="/" className="hover:text-gray-400">Strona główna</a>
                </li>
                {!keycloak.authenticated ? (
                <li>
                    <a href="/login" className="hover:text-gray-400">Logowanie</a>
                </li>
                ):
                <li>
                    <a href="/account" className="hover:text-gray-400">Konto</a>
                    <a onClick={handleLogout} className="hover:text-gray-400">Wyloguj</a>
                </li>
                }

                <li>
                    <a href="/contact" className="hover:text-gray-400">cos tam</a>
                </li>
            </ul>
        </nav>
    );
}