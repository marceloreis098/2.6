import React from 'react';
import { User, HeaderStyle } from '../types';
import Icon from './common/Icon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  onToggleSidebar: () => void;
  companyName: string;
  headerStyle: HeaderStyle;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleTheme, currentTheme, onToggleSidebar, companyName, headerStyle }) => {
  return (
    <header className="h-20 bg-white dark:bg-dark-card shadow-md flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
      <div className="flex items-center min-w-0 flex-grow">
        <button onClick={onToggleSidebar} className="text-gray-500 dark:text-dark-text-secondary focus:outline-none lg:hidden mr-4">
            <Icon name="Menu" size={24} />
        </button>
        <h2 
            className="font-bold text-brand-secondary dark:text-dark-text-primary truncate tracking-wide w-full"
            style={{
                fontFamily: headerStyle.fontFamily,
                fontSize: headerStyle.fontSize,
                textAlign: headerStyle.textAlign,
            }}
        >
            {companyName}
        </h2>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <button onClick={onToggleTheme} className="text-gray-600 dark:text-yellow-400 hover:text-brand-primary dark:hover:text-yellow-300 transition-colors p-2 rounded-full" title="Alternar tema">
            {currentTheme === 'light' ? <Icon name="Moon" size={22} /> : <Icon name="Sun" size={22} />}
        </button>
        <div className="text-right mr-2 hidden sm:block">
          <p className="font-semibold text-brand-secondary dark:text-dark-text-primary">{user.realName}</p>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{user.role}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {user.realName.charAt(0)}
        </div>
         <button onClick={onLogout} className="text-gray-500 dark:text-dark-text-secondary hover:text-red-500 transition-colors p-2 rounded-full" title="Sair">
            <Icon name="LogOut" size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;