
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getEquipment, getLicenses } from '../services/apiService';
import { Equipment, License, Page } from '../types';
import Icon from './common/Icon';

interface DashboardProps {
    setActivePage: (page: Page) => void;
}

const PIE_COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#1abc9c', '#d35400'];

const Dashboard: React.FC<DashboardProps> = ({setActivePage}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [equipmentData, licensesData] = await Promise.all([
          getEquipment(),
          getLicenses(),
        ]);
        setEquipment(equipmentData);
        setLicenses(licensesData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isDarkMode = document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#edf2f7' : '#333';
  const tooltipBackgroundColor = isDarkMode ? '#2d3748' : '#ffffff';
  const tooltipBorderColor = isDarkMode ? '#4a5568' : '#cccccc';
  
  // Stats calculation
  const totalEquipment = equipment.length;
  const statusCounts = equipment.reduce((acc, item) => {
      const status = item.status || 'Indefinido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
  }, {} as {[key: string]: number});
  
  const expiringLicenses = licenses.filter(l => {
      if (!l.dataExpiracao || l.dataExpiracao === 'N/A') return false;
      const expDate = new Date(l.dataExpiracao);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return expDate > today && expDate <= thirtyDaysFromNow;
  }).length;


  const localData = equipment.reduce((acc, item) => {
    const localName = item.local || 'Não especificado';
    const existingLocal = acc.find(d => d.name === localName);
    if (existingLocal) {
      existingLocal.value += 1;
    } else {
      acc.push({ name: localName, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));


  const StatCard = ({ icon, title, value, color, onClick }: { icon: any, title: string, value: string | number, color: string, onClick?: () => void }) => (
    <div className={`bg-white dark:bg-dark-card p-6 rounded-lg shadow-md flex items-center ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={onClick}>
      <div className={`p-4 rounded-full ${color}`}>
        <Icon name={icon} size={24} className="text-white" />
      </div>
      <div className="ml-4">
        <p className="text-lg font-semibold text-gray-700 dark:text-dark-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-brand-dark dark:text-dark-text-primary mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard icon="Computer" title="Total de Itens" value={totalEquipment} color="bg-blue-500" onClick={() => setActivePage('Inventário de Equipamentos')} />
        <StatCard icon="Play" title="Em Uso" value={statusCounts['Em Uso'] || 0} color="bg-status-active"/>
        <StatCard icon="Archive" title="Estoque" value={statusCounts['Estoque'] || 0} color="bg-yellow-500" />
        <StatCard icon="Timer" title="Licenças Expirando" value={expiringLicenses} color="bg-red-500" onClick={() => setActivePage('Controle de Licenças')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-brand-dark dark:text-dark-text-primary">Equipamentos por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" stroke={textColor} />
              <YAxis stroke={textColor} allowDecimals={false}/>
              <Tooltip cursor={{fill: 'rgba(128,128,128,0.1)'}} contentStyle={{ backgroundColor: tooltipBackgroundColor, borderColor: tooltipBorderColor }}/>
              <Legend wrapperStyle={{ color: textColor }} />
              <Bar dataKey="value" name="Total" fill="#8884d8">
                 {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-brand-dark dark:text-dark-text-primary">Itens por Local</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={localData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={{ fill: textColor }}>
                 {localData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: tooltipBackgroundColor, borderColor: tooltipBorderColor }}/>
              <Legend wrapperStyle={{ color: textColor }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;