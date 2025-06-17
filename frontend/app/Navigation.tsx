'use client'
import { useKeycloak } from '@react-keycloak/web';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navigation() {
    const { keycloak, initialized } = useKeycloak();

   const handleLogout = async () => {  
    try {
        console.log('🔍 Blacklisting token in Redis...');
        
        // ✅ JEDEN REQUEST - bezpośrednio do Redis
        const response = await fetch('/api/blacklist-token', {  
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keycloak.token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Token blacklisted in Redis:', data);
        } else {
            const error = await response.json();
            console.error('❌ Token blacklisting failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Error blacklisting token:', error);
    }
    
    console.log('🔍 Proceeding to Keycloak logout...');
    keycloak.logout();
}

    const router = useRouter();
       
    
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

    return (
        <nav className="flex items-center justify-between p-4 bg-gray-800 text-white">
            <div className="text-lg font-bold">
                <Link href="/" className="text-lg font-bold flex items-center hover:text-white hover:scale-105 transition-all duration-300 group">
                    <span className="group-hover:scale-110 transition-transform duration-200">Tw</span>
                    <svg className="w-5 h-5 mx-0.5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="group-hover:scale-110 transition-transform duration-200">j Kwadrat</span>
                </Link>
            </div>
            
            <ul className="flex space-x-4">
                {!keycloak.authenticated ? (
                    <li className="relative group">
                        <div className="cursor-pointer hover:text-blue-400 transition-colors duration-200">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-8 h-8 transform group-hover:scale-110 transition-transform duration-200"
                            >
                                <g fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.796 20.706c-.342-1.063-1.096-2.003-2.143-2.673C14.605 17.363 13.32 17 12 17s-2.605.363-3.653 1.033c-1.047.67-1.8 1.61-2.143 2.673"></path>
                                    <circle cx="12" cy="10" r="3" strokeLinecap="round"></circle>
                                    <rect width="18" height="18" x="3" y="3" rx="3"></rect>
                                </g>
                            </svg>
                        </div>

                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl py-2 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out border border-gray-200">
                            <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                            
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">Dołącz do nas!</p>
                                <p className="text-xs text-gray-500">Zarządzaj swoimi ogłoszeniami</p>
                            </div>
                            
                            <div className="py-1">
                                <div  onClick={handleLogin} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 group/item">
                                    <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    <div>
                                        <div className="font-medium">Zaloguj się</div>
                                        <div className="text-xs text-gray-500">Masz już konto?</div>
                                    </div>
                                </div>
                                
                                <div onClick={handleRegister} className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 group/item">
                                    <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                    <div>
                                        <div className="font-medium">Zarejestruj się</div>
                                        <div className="text-xs text-gray-500">Nowe konto za darmo</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                <p className="text-xs text-gray-500 text-center">
                                    Szybka rejestracja • Darmowe ogłoszenia
                                </p>
                            </div>
                        </div>
                    </li>
                ) : (
                    <>
                       <li className="relative group">
    <div className="cursor-pointer hover:text-blue-400 transition-colors duration-200">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-7 h-7 transform group-hover:scale-110 transition-transform duration-200"
        >
            <g fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.796 20.706c-.342-1.063-1.096-2.003-2.143-2.673C14.605 17.363 13.32 17 12 17s-2.605.363-3.653 1.033c-1.047.67-1.8 1.61-2.143 2.673"></path>
                <circle cx="12" cy="10" r="3" strokeLinecap="round"></circle>
                <rect width="18" height="18" x="3" y="3" rx="3"></rect>
            </g>
        </svg>
    </div>

    {/* Elegancki wysuwanego panel dla zalogowanego użytkownika */}
    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl py-2 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out border border-gray-200">
        {/* Strzałka wskazująca na ikonę */}
        <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
        
        {/* Nagłówek z info o użytkowniku */}
        <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
                {keycloak.tokenParsed?.preferred_username || 'Użytkownik'}
            </p>
            <p className="text-xs text-gray-500">Zarządzaj swoim kontem</p>
        </div>
        
        {/* Opcje menu */}
        <div className="py-1">
            <Link href="/profile" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 group/item">
                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                    <div className="font-medium">Mój profil</div>
                    <div className="text-xs text-gray-500">Edytuj dane osobowe</div>
                </div>
            </Link>
            
            <Link href="/my-posts" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 group/item">
                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <div>
                    <div className="font-medium">Moje ogłoszenia</div>
                    <div className="text-xs text-gray-500">Zobacz wszystkie</div>
                </div>
            </Link>

            <Link href="/favorites" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-150 group/item">
                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <div>
                    <div className="font-medium">Ulubione</div>
                    <div className="text-xs text-gray-500">Zapisane pokoje</div>
                </div>
            </Link>

            <Link href="/settings" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 transition-colors duration-150 group/item">
                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover/item:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                    <div className="font-medium">Ustawienia</div>
                    <div className="text-xs text-gray-500">Preferencje konta</div>
                </div>
            </Link>
        </div>
        
        {/* Separator */}
        <div className="border-t border-gray-100 my-1"></div>
        
        {/* Wyloguj */}
        <div className="py-1">
            <div onClick={handleLogout} className="flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 group/item cursor-pointer">
                <svg className="w-4 h-4 mr-3 text-red-400 group-hover/item:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <div>
                    <div className="font-medium">Wyloguj się</div>
                    <div className="text-xs text-red-400">Zakończ sesję</div>
                </div>
            </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
                Bezpieczne logowanie • Ochrona danych
            </p>
        </div>
    </div>
</li>

                        <li>
                            <Link href="/create_post" className="hover:text-gray-400 group" title="Dodaj ogłoszenie">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="w-7 h-7 group-hover:scale-110 transition-transform duration-200"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M14.96 11.7a1.98 1.98 0 0 0-.8-1.3l-5-3.57c-.7-.5-1.63-.5-2.32 0l-5 3.57c-.53.38-.84.98-.84 1.63V19c0 1.1.9 2 2 2h3v-6h4v6h1.68c-.43-.91-.68-1.92-.68-3a6.99 6.99 0 0 1 3.96-6.3M23 13.11V4.97C23 3.88 22.12 3 21.03 3h-9.06C10.88 3 10 3.88 10 4.97l.02.05c.1.06.21.11.3.18l5 3.57c.79.56 1.34 1.4 1.56 2.32c.37-.05.74-.09 1.12-.09c1.96 0 3.73.81 5 2.11M17 7h2v2h-2z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M23 18c0-2.76-2.24-5-5-5s-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5m-5.5 3v-2.5H15v-1h2.5V15h1v2.5H21v1h-2.5V21z"
                                    />
                                </svg>
                            </Link>
                        </li>
                    </>
                )}

                {keycloak.authenticated && keycloak.hasRealmRole('admin') && (
                    <li>
                        <Link href="/admin" className="hover:text-red-400 transition-colors group" title="Panel admina">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-7 h-7 group-hover:scale-110 transition-transform duration-200"
                            >
                                <circle
                                    cx="17"
                                    cy="15.5"
                                    r="1.12"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                />
                                <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    d="M17 17.5c-.73 0-2.19.36-2.24 1.08c.5.71 1.32 1.17 2.24 1.17s1.74-.46 2.24-1.17c-.05-.72-1.51-1.08-2.24-1.08"
                                />
                                <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    d="M18 11.09V6.27L10.5 3L3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82c.55-.13 1.08-.32 1.6-.55A5.97 5.97 0 0 0 17 23c3.31 0 6-2.69 6-6c0-2.97-2.16-5.43-5-5.91M11 17c0 .56.08 1.11.23 1.62c-.24.11-.48.22-.73.3c-3.17-1-5.5-4.24-5.5-7.74v-3.6l5.5-2.4l5.5 2.4v3.51c-2.84.48-5 2.94-5 5.91m6 4c-2.21 0-4-1.79-4-4s1.79-4 4-4s4 1.79 4 4s-1.79 4-4 4"
                                />
                            </svg>
                        </Link>
                    </li>
                )}
            </ul>
        </nav>
    );
}