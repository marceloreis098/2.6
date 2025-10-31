import React, { useState, useEffect, Suspense, lazy } from 'react';
import { User, UserRole, Page, HeaderStyle } from './types';
import Icon from './components/common/Icon';
import { syncWithAbsolute, saveAbsoluteConfig } from './services/apiService';

// Lazy load components
const Sidebar = lazy(() => import('./components/Sidebar'));
const Header = lazy(() => import('./components/Header'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const EquipmentList = lazy(() => import('./components/EquipmentList'));
const AbsoluteInventory = lazy(() => import('./components/AbsoluteInventory'));
const LicenseControl = lazy(() => import('./components/LicenseControl'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Settings = lazy(() => import('./components/Settings'));
const Login = lazy(() => import('./components/Login'));
const TwoFactorAuth = lazy(() => import('./components/TwoFactorAuth'));
const AuditLog = lazy(() => import('./components/AuditLog'));


const LoadingFallback: React.FC = () => (
    <div className="w-full h-full flex justify-center items-center bg-gray-200 dark:bg-gray-800">
        <Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} />
    </div>
);


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userAwaiting2FA, setUserAwaiting2FA] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Global settings state
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('companyName') || 'Inventário Pro';
  });
  const [isSsoEnabled, setIsSsoEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSsoEnabled');
    return saved ? JSON.parse(saved) : false; // Default to false in production
  });
  // New SAML SSO State
  const [ssoUrl, setSsoUrl] = useState<string>(() => localStorage.getItem('ssoUrl') || '');
  const [ssoEntityId, setSsoEntityId] = useState<string>(() => localStorage.getItem('ssoEntityId') || '');
  const [ssoCertificate, setSsoCertificate] = useState<string>(() => localStorage.getItem('ssoCertificate') || '');

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('geminiApiKey') || '';
  });
  const [is2faRequired, setIs2faRequired] = useState<boolean>(() => {
    const saved = localStorage.getItem('is2faRequired');
    return saved ? JSON.parse(saved) : true; // Default to true (more secure)
  });
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>(() => {
    const saved = localStorage.getItem('headerStyle');
    return saved ? JSON.parse(saved) : {
      fontFamily: 'inherit',
      fontSize: '1.5rem', // Corresponds to text-2xl
      textAlign: 'left',
    };
  });
  // Absolute Resilience Integration State
  const [absoluteTokenId, setAbsoluteTokenId] = useState<string>(() => localStorage.getItem('absoluteTokenId') || '');
  const [absoluteSecretKey, setAbsoluteSecretKey] = useState<string>(() => localStorage.getItem('absoluteSecretKey') || '');
  const [absoluteSyncInterval, setAbsoluteSyncInterval] = useState<number>(() => {
      const saved = localStorage.getItem('absoluteSyncInterval');
      return saved ? parseInt(saved, 10) : 0; // 0 for disabled
  });

  useEffect(() => {
    try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
            const savedUser = JSON.parse(savedUserJSON);
            setCurrentUser(savedUser);
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('currentUser');
    } finally {
        setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Automatic Sync with Absolute
  useEffect(() => {
    // FIX: The return type of setInterval in the browser is a number, not NodeJS.Timeout.
    let intervalId: number;
    if (currentUser && absoluteSyncInterval > 0 && absoluteTokenId && absoluteSecretKey) {
        const sync = async () => {
            console.log(`[${new Date().toISOString()}] Running automatic sync with Absolute...`);
            try {
                // FIX: The syncWithAbsolute function requires the username of the user initiating the sync.
                const result = await syncWithAbsolute(currentUser.username);
                console.log(`Auto-sync successful: ${result.message}`);
            } catch (error) {
                console.error("Auto-sync with Absolute failed:", error);
            }
        };

        // Run once on startup, then set interval
        sync(); 
        intervalId = setInterval(sync, absoluteSyncInterval * 60 * 60 * 1000); // Convert hours to ms
    }
    return () => clearInterval(intervalId); // Cleanup on component unmount or settings change
  }, [currentUser, absoluteSyncInterval, absoluteTokenId, absoluteSecretKey]);


  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLoginSuccess = (user: User) => {
    if (is2faRequired && user.is2FAEnabled && !user.ssoProvider) {
       setUserAwaiting2FA(user);
    } else {
       handle2FASuccess(user);
    }
  };

  const handle2FASuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setUserAwaiting2FA(null);
    setActivePage('Dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserAwaiting2FA(null);
    localStorage.removeItem('currentUser');
  };

  const handleSettingsSave = async (settings: { 
    sso: boolean; ssoUrl: string; ssoEntityId: string; ssoCertificate: string; 
    apiKey: string; twoFactor: boolean; companyName: string; headerStyle: HeaderStyle;
    absoluteTokenId: string; absoluteSecretKey: string; absoluteSyncInterval: number;
   }): Promise<void> => {
    // Save to local state and localStorage first for UI responsiveness
    setIsSsoEnabled(settings.sso);
    localStorage.setItem('isSsoEnabled', JSON.stringify(settings.sso));
    
    setSsoUrl(settings.ssoUrl);
    localStorage.setItem('ssoUrl', settings.ssoUrl);

    setSsoEntityId(settings.ssoEntityId);
    localStorage.setItem('ssoEntityId', settings.ssoEntityId);

    setSsoCertificate(settings.ssoCertificate);
    localStorage.setItem('ssoCertificate', settings.ssoCertificate);

    setGeminiApiKey(settings.apiKey);
    localStorage.setItem('geminiApiKey', settings.apiKey);

    setIs2faRequired(settings.twoFactor);
    localStorage.setItem('is2faRequired', JSON.stringify(settings.twoFactor));

    setCompanyName(settings.companyName);
    localStorage.setItem('companyName', settings.companyName);

    setHeaderStyle(settings.headerStyle);
    localStorage.setItem('headerStyle', JSON.stringify(settings.headerStyle));

    setAbsoluteTokenId(settings.absoluteTokenId);
    localStorage.setItem('absoluteTokenId', settings.absoluteTokenId);
    
    setAbsoluteSecretKey(settings.absoluteSecretKey);
    localStorage.setItem('absoluteSecretKey', settings.absoluteSecretKey);

    setAbsoluteSyncInterval(settings.absoluteSyncInterval);
    localStorage.setItem('absoluteSyncInterval', String(settings.absoluteSyncInterval));

    try {
        // Save integration settings to the server
        await saveAbsoluteConfig({
            tokenId: settings.absoluteTokenId,
            secretKey: settings.absoluteSecretKey,
        });
        alert("Configurações salvas com sucesso!");
    } catch (error: any) {
        alert(`Falha ao salvar configurações de integração no servidor: ${error.message}`);
        // Optionally re-throw or handle the error further
        throw error;
    }
  };

  if (isInitializing) {
      return <LoadingFallback />;
  }

  if (!currentUser && !userAwaiting2FA) {
    return <Suspense fallback={<LoadingFallback />}><Login onLoginSuccess={handleLoginSuccess} isSsoEnabled={isSsoEnabled} /></Suspense>;
  }

  if (userAwaiting2FA) {
      return (
        <Suspense fallback={<LoadingFallback />}>
            <TwoFactorAuth 
                user={userAwaiting2FA} 
                onVerificationSuccess={handle2FASuccess}
                onCancel={handleLogout}
            />
        </Suspense>
      );
  }

  // This part was missing. User must be logged in here.
  if (!currentUser) {
    // Fallback in case state is inconsistent.
    return <Suspense fallback={<LoadingFallback />}><Login onLoginSuccess={handleLoginSuccess} isSsoEnabled={isSsoEnabled} /></Suspense>;
  }

  // Define pages based on user role
  const pages: Page[] = ['Dashboard', 'Inventário de Equipamentos', 'Inventário Absolute', 'Controle de Licenças'];
  if (currentUser.role === UserRole.Admin || currentUser.role === UserRole.UserManager) {
    pages.push('Usuários e Permissões');
  }
   if (currentUser.role === UserRole.Admin) {
    pages.push('Auditoria');
    pages.push('Configurações');
  }


  const renderActivePage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'Inventário de Equipamentos':
        return <EquipmentList currentUser={currentUser} companyName={companyName} />;
      case 'Inventário Absolute':
        return <AbsoluteInventory />;
      case 'Controle de Licenças':
        return <LicenseControl currentUser={currentUser} />;
      case 'Usuários e Permissões':
        if (currentUser.role !== UserRole.User) {
          return <UserManagement currentUser={currentUser} />;
        }
        return null;
       case 'Auditoria':
        if (currentUser.role === UserRole.Admin) {
          return <AuditLog />;
        }
        return null;
      case 'Configurações':
        if (currentUser.role === UserRole.Admin) {
            return <Settings 
                        currentUser={currentUser} 
                        onSave={handleSettingsSave} 
                        currentSettings={{ 
                            sso: isSsoEnabled, ssoUrl, ssoEntityId, ssoCertificate, apiKey: geminiApiKey, twoFactor: is2faRequired, 
                            companyName: companyName, headerStyle: headerStyle,
                            absoluteTokenId: absoluteTokenId, absoluteSecretKey: absoluteSecretKey, 
                            absoluteSyncInterval: absoluteSyncInterval
                        }}
                    />;
        }
        return null;
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-dark-bg ${theme}`}>
      <Suspense fallback={<div className="w-64 h-screen bg-brand-dark flex-shrink-0"></div>}>
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          pages={pages}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<div className="h-20 bg-white dark:bg-dark-card flex-shrink-0"></div>}>
          <Header
            user={currentUser}
            onLogout={handleLogout}
            onToggleTheme={toggleTheme}
            currentTheme={theme}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            companyName={companyName}
            headerStyle={headerStyle}
          />
        </Suspense>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            {renderActivePage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
