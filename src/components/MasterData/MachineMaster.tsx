import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Machine } from '../../types';
import { Plus, Edit2, Trash2, Save, X, Copy, Download, Upload, Activity, Clock, Zap, MapPin } from 'lucide-react';

const MachineMaster: React.FC = () => {
  const { machines, addMachine, updateMachine, deleteMachine, purchaseOrders, products, deletePurchaseOrder } = useApp();

  // Helper function to calculate working hours from shift timing
  const calculateWorkingHoursFromShift = (shiftTiming: string): number => {
    if (shiftTiming === 'Custom') return 8; // Default for custom shifts

    const [start, end] = shiftTiming.split('-');
    if (!start || !end) return 8;

    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);

    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.round(diffHours * 10) / 10; // Round to 1 decimal place
  };

  // Export machines to CSV
  const exportMachines = () => {
    const csvContent = [
      ['Machine Name', 'Machine Type', 'Capacity', 'Shift Timing', 'Status', 'Location', 'Efficiency (%)', 'Last Maintenance', 'Next Maintenance', 'Power (kW)'],
      ...machines.map(machine => [
        machine.machineName,
        machine.machineType,
        machine.capacity,
        machine.shiftTiming,
        machine.status,
        machine.location,
        machine.efficiency.toString(),
        machine.lastMaintenance,
        machine.nextMaintenance,
        machine.specifications.power
      ])
    ].map(row => row.map(field => `"${field || ''}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `machines_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import machines from CSV
  const importMachines = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');

      const importedMachines: Partial<Machine>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const machine: Partial<Machine> = {
          machineName: values[0] || '',
          machineType: values[1] || '',
          capacity: values[2] || '',
          shiftTiming: values[3] || '09:00-17:00',
          status: (values[4] as Machine['status']) || 'active',
          location: values[5] || '',
          efficiency: parseInt(values[6]) || 100,
          lastMaintenance: values[7] || '',
          nextMaintenance: values[8] || '',
          specifications: {
            power: values[9] || '',
            dimensions: '',
            weight: ''
          },
          problems: []
        };

        if (machine.machineName) {
          importedMachines.push(machine);
        }
      }

      // Add imported machines
      importedMachines.forEach(machine => {
        const newMachine: Machine = {
          id: crypto.randomUUID(),
          machineName: machine.machineName || '',
          machineType: machine.machineType || '',
          capacity: machine.capacity || '',
          workingHours: calculateWorkingHoursFromShift(machine.shiftTiming || '09:00-17:00'),
          shiftTiming: machine.shiftTiming || '09:00-17:00',
          status: machine.status || 'active',
          location: machine.location || '',
          efficiency: machine.efficiency || 100,
          lastMaintenance: machine.lastMaintenance || '',
          nextMaintenance: machine.nextMaintenance || '',
          specifications: machine.specifications || { power: '', dimensions: '', weight: '' },
          problems: machine.problems || []
        };
        addMachine(newMachine);
      });

      alert(`Successfully imported ${importedMachines.length} machines`);
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Machine & { associatedProcesses?: { productId: string; stepId: string }[] }>>({
    machineName: '',
    machineType: '',
    capacity: '',
    shiftTiming: '09:00-17:00',
    status: 'active',
    location: '',
    efficiency: 100,
    lastMaintenance: '',
    nextMaintenance: '',
    specifications: {
      power: '',
      dimensions: '',
      weight: '',
    },
    problems: [],
    associatedProcesses: [], // NEW
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMachine(editingId, formData);
      setEditingId(null);
    } else {
      const newMachine: Machine = {
        id: crypto.randomUUID(),
        machineName: formData.machineName || '',
        machineType: formData.machineType || '',
        capacity: formData.capacity || '',
        workingHours: calculateWorkingHoursFromShift(formData.shiftTiming || '09:00-17:00'),
        shiftTiming: formData.shiftTiming || '09:00-17:00',
        status: formData.status || 'active',
        location: formData.location || '',
        efficiency: formData.efficiency || 100,
        lastMaintenance: formData.lastMaintenance || '',
        nextMaintenance: formData.nextMaintenance || '',
        operatorId: formData.operatorId,
        specifications: {
          power: formData.specifications?.power || '',
          dimensions: formData.specifications?.dimensions || '',
          weight: formData.specifications?.weight || '',
        },
        problems: formData.problems || [],
        // associatedProcesses is not part of Machine type, but can be used for UI/analytics
      };
      addMachine(newMachine);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      machineName: '',
      machineType: '',
      shiftTiming: '09:00-17:00',
      status: 'active',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (machine: Machine) => {
    setFormData(machine);
    setEditingId(machine.id);
    setIsAdding(true);
  };

  // When deleting a machine, also delete all SOs that use this machine
  const handleDeleteMachine = (machineId: string) => {
    // Find all productIds that use this machine in their processFlow
    const affectedProductIds = products
      .filter(product => product.processFlow.some(step => step.machineId === machineId))
      .map(product => product.id);
    // Find all SOs that use these products
    const affectedSOs = purchaseOrders.filter(po => affectedProductIds.includes(po.productId));
    // Delete each affected SO
    affectedSOs.forEach(po => deletePurchaseOrder(po.id));
    // Delete the machine
    deleteMachine(machineId);
  };

  const handleDuplicate = (machine: Machine) => {
    const duplicated = {
      ...machine,
      id: crypto.randomUUID(),
      machineName: machine.machineName + ' (Copy)',
    };
    setFormData(duplicated);
    setIsAdding(true);
    setEditingId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-100';
      case 'maintenance': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-100';
      case 'breakdown': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Machine Inventory</h2>
          <p className="text-sm text-gray-500">Manage production equipment and status</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportMachines}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer text-sm font-medium">
            <Upload size={16} />
            Import
            <input
              type="file"
              accept=".csv"
              onChange={importMachines}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-colors shadow-lg shadow-orange-200 text-sm font-medium"
          >
            <Plus size={16} />
            Add Machine
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Machine' : 'Add New Machine'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-[#F24E1E]" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Machine Name</label>
                    <input
                      type="text"
                      value={formData.machineName}
                      onChange={(e) => setFormData(prev => ({ ...prev, machineName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
                    <input
                      type="text"
                      value={formData.machineType}
                      onChange={(e) => setFormData(prev => ({ ...prev, machineType: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</label>
                    <input
                      type="text"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Machine['status'] }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Operational Details */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[#F24E1E]" />
                  Operational Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift Timing</label>
                    <select
                      value={formData.shiftTiming}
                      onChange={(e) => setFormData(prev => ({ ...prev, shiftTiming: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    >
                      <option value="09:00-17:00">Day Shift (9AM - 5PM)</option>
                      <option value="17:00-01:00">Evening Shift (5PM - 1AM)</option>
                      <option value="01:00-09:00">Night Shift (1AM - 9AM)</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Efficiency (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.efficiency}
                      onChange={(e) => setFormData(prev => ({ ...prev, efficiency: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Power Consumption (kW)</label>
                    <div className="relative">
                      <Zap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.specifications?.power}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specifications: { ...prev.specifications!, power: e.target.value }
                        }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Associated Processes (Read-only for now, or simple list) */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-[#F24E1E]" />
                  Associated Processes
                </h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-500">
                  <p>Processes are automatically linked when you assign this machine to a product step.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-colors shadow-lg shadow-orange-200 font-medium flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Machine Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Efficiency</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machines.map((machine) => (
                <tr key={machine.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{machine.machineName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {machine.machineType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(machine.status)}`}>
                      {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${machine.efficiency >= 90 ? 'bg-green-500' : machine.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${machine.efficiency}%` }}
                        ></div>
                      </div>
                      <span>{machine.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {machine.shiftTiming}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicate(machine)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(machine)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMachine(machine.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Activity size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No machines found. Add one to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MachineMaster;