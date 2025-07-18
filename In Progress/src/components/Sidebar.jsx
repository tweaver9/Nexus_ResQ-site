import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useClientStore from '../store/clientStore';
import SidebarButton from './SidebarButton';


// Dummy client list for dropdown
const dummyClients = [
  { id: 'nexus', name: 'Nexus ResQ' },
  { id: 'spacex', name: 'SpaceX' },
  { id: 'tesla', name: 'Tesla' },
  { id: 'blueorigin', name: 'Blue Origin' },
];


const Sidebar = ({ activePanel }) => {
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('nexus');
  const { clientId, role, setClientId } = useClientStore();
  const navigate = useNavigate();
  return (
    <div className="h-full w-64 flex flex-col shadow-lg bg-transparent">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 text-3xl font-extrabold tracking-wide text-white">
        LOGO
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col justify-between">
        <div className="px-2 py-4 space-y-1">
          <SidebarButton
            active={activePanel === 'dashboard'}
            onClick={() => navigate('/')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            HOME
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Admin'}
            onClick={() => navigate('/admin')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            ADMIN
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Inspections'}
            onClick={() => navigate('/inspections')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            INSPECTIONS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Assignments'}
            onClick={() => navigate('/assignments')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            ASSIGNMENTS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Assets'}
            onClick={() => navigate('/assets')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            ASSETS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Users'}
            onClick={() => navigate('/users')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            USERS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Logs'}
            onClick={() => navigate('/logs')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            LOGS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Analytics'}
            onClick={() => navigate('/analytics')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            ANALYTICS
          </SidebarButton>
          <SidebarButton
            active={activePanel === 'Help'}
            onClick={() => navigate('/help')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            HELP
          </SidebarButton>
        </div>
        <div className="px-2 pb-4 space-y-1 border-t border-gray-800">
          <SidebarButton
            active={activePanel === 'Firebase Manager'}
            onClick={() => navigate('/firebase-manager')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            FIREBASE MANAGER
          </SidebarButton>
          {role === 'nexus' && (
            <SidebarButton
              active={activePanel === 'Nexus Admin'}
              onClick={() => setShowClientModal(true)}
              className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
            >
              NEXUS ADMIN
            </SidebarButton>
          )}
          <SidebarButton
            active={activePanel === 'Onboard Client'}
            onClick={() => navigate('/onboard-client')}
            className="w-full text-lg font-semibold text-white hover:text-yellow-400 transition"
          >
            ONBOARD CLIENT
          </SidebarButton>
        </div>
        {role === 'nexus' && showClientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowClientModal(false)}>
            <div className="bg-gray-900 border-2 border-yellow-400 rounded-xl p-8 min-w-[340px] max-w-[420px] text-white shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <h2 className="text-yellow-400 font-bold text-lg mb-4">Switch Client Dashboard</h2>
              <div className="mb-4">
                <label htmlFor="client-select" className="font-semibold">Select Client:</label>
                <select
                  id="client-select"
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="ml-4 px-4 py-2 rounded-md border border-yellow-400 bg-gray-800 text-white font-semibold text-base"
                >
                  {dummyClients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-6 text-right space-x-2">
                <button
                  onClick={() => setShowClientModal(false)}
                  className="border border-yellow-400 text-yellow-400 rounded-md px-4 py-2 font-semibold text-base transition hover:bg-yellow-400 hover:text-gray-900 mr-2"
                >Cancel</button>
                <button
                  onClick={() => {
                    setClientId(selectedClient);
                    setShowClientModal(false);
                    alert(`Switched to client: ${selectedClient}`);
                  }}
                  className="bg-yellow-400 text-gray-900 rounded-md px-4 py-2 font-bold text-base transition hover:bg-yellow-500"
                >Switch</button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
