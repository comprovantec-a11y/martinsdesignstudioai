import React, { useState } from 'react';
import { AppTab } from './types';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import ImageReformatter from './components/ImageReformatter';
import ProfessionalDesigner from './components/ProfessionalDesigner';
import ProfileMenu from './components/ProfileMenu';
import { UserProvider } from './contexts/UserContext';
import SubscriptionModal from './components/SubscriptionModal';

const Header: React.FC<{ onSubscriptionClick: () => void }> = ({ onSubscriptionClick }) => (
  <header className="flex justify-between items-center py-6">
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
        MARTINS DESIGN Studio AI
      </h1>
      <p className="text-gray-400 mt-2">Crie, Edite e redimensione com o poder da IA</p>
    </div>
    <ProfileMenu onSubscriptionClick={onSubscriptionClick} />
  </header>
);

interface TabButtonProps {
    label: AppTab;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105";
    
    // Estilo especial para o botão "Meu Designer 24h"
    if (label === AppTab.DESIGNER) {
        const activeDesignerClasses = "text-white bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg ring-2 ring-purple-400";
        const inactiveDesignerClasses = "text-gray-200 bg-gray-700 hover:bg-gray-600";
         return (
            <button
                onClick={onClick}
                className={`${baseClasses} ${isActive ? activeDesignerClasses : inactiveDesignerClasses}`}
            >
                <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    {label} (TESTE BETA)
                </span>
            </button>
        );
    }

    const activeClasses = "bg-indigo-600 text-white shadow-lg";
    const inactiveClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
};


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GENERATE);
  const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.GENERATE:
        return <ImageGenerator />;
      case AppTab.EDIT:
        return <ImageEditor />;
      case AppTab.REFORMAT:
        return <ImageReformatter />;
      case AppTab.DESIGNER:
        return <ProfessionalDesigner />;
      default:
        return null;
    }
  };

  return (
    <UserProvider>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <div className="container mx-auto px-4 py-4">
          <Header onSubscriptionClick={() => setSubscriptionModalOpen(true)} />

          <nav className="flex flex-wrap justify-center items-center gap-2 md:gap-4 mb-8">
              {Object.values(AppTab).map((tab) => (
                  <TabButton
                      key={tab}
                      label={tab}
                      isActive={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                  />
              ))}
          </nav>

          <main>
            {renderContent()}
          </main>
        </div>
        <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setSubscriptionModalOpen(false)} />
      </div>
    </UserProvider>
  );
};

export default App;
