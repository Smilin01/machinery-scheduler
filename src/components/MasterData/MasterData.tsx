import React, { useState } from 'react';
import UserMaster from './UserMaster';
import MachineMaster from './MachineMaster';
import ProductMaster from './ProductMaster';

const MasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'machine' | 'product'>('user');

  const tabs = [
    { id: 'user', label: 'User Master', component: UserMaster },
    { id: 'machine', label: 'Machine Master', component: MachineMaster },
    { id: 'product', label: 'Product Master', component: ProductMaster },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || UserMaster;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Master Data</h1>
        <p className="text-gray-500">Manage your system's core data entities.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <nav className="flex px-6 gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id
                    ? 'border-[#F24E1E] text-[#F24E1E]'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default MasterData;