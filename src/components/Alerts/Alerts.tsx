import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  Search,
  Clock,
  Wrench,
  Package,
  Zap,
  ChevronRight,
  ArrowRight,
  Calendar,
  RefreshCw,
  AlertOctagon,
  MoreHorizontal,
  SlidersHorizontal
} from 'lucide-react';
import { Alert, ScheduleItem } from '../../types';
import { optimizeSchedule } from '../../utils/scheduling';

const Alerts: React.FC = () => {
  const { alerts, resolveAlert, setAlerts, updatePurchaseOrder, updateMachine, machines, purchaseOrders, addSystemNotification, products } = useApp();
  const { setScheduleItems, scheduleItems } = useApp();

  // Helper: Calculate current load for a machine
  const getMachineLoad = (machineId: string) => {
    return scheduleItems.filter(item => item.machineId === machineId).reduce((sum, item) => sum + (item.allocatedTime || 0), 0);
  };
  // Helper: Get machine capacity (assume workingHours * 60 for minutes per day)
  const getMachineCapacity = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? (machine.workingHours || 8) * 60 : 480;
  };
  // Helper: Get job details
  const getJobDetails = (item: ScheduleItem) => {
    const product = products.find(p => p.id === item.productId);
    const step = product?.processFlow.find(s => s.machineId === item.machineId && s.sequence === item.processStep);
    return step ? `${step.stepName} (${step.cycleTimePerPart}min/part)` : `Step ${item.processStep}`;
  };

  // State for selected jobs and error
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [redistributeError, setRedistributeError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'delivery_risk' | 'machine_breakdown' | 'quality_issue' | 'capacity_overload'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState<{ open: boolean, poId: string }>({ open: false, poId: '' });
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<{ open: boolean, machineId: string }>({ open: false, machineId: '' });
  const [newMaintenanceDate, setNewMaintenanceDate] = useState('');
  const [showRedistributeModal, setShowRedistributeModal] = useState<{ open: boolean, machineId: string }>({ open: false, machineId: '' });

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' ||
      (filter === 'unresolved' && !alert.isResolved) ||
      alert.type === filter;

    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;

    const matchesSearch = alert.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSeverity && matchesSearch;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'delivery_risk': return <Clock size={16} className="text-red-500" />;
      case 'machine_breakdown': return <Wrench size={16} className="text-amber-500" />;
      case 'quality_issue': return <Package size={16} className="text-purple-500" />;
      case 'capacity_overload': return <Zap size={16} className="text-orange-500" />;
      default: return <AlertTriangle size={16} className="text-gray-500" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
      case 'high': return { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' };
      case 'medium': return { border: 'border-l-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' };
      case 'low': return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' };
      default: return { border: 'border-l-gray-500', bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' };
    }
  };

  const resolveAllAlerts = () => {
    alerts.forEach(alert => {
      if (!alert.isResolved) {
        resolveAlert(alert.id);
      }
    });
  };

  const clearResolvedAlerts = () => {
    setAlerts(alerts.filter((a: Alert) => !a.isResolved));
  };

  const unresolvedCount = alerts.filter(a => !a.isResolved).length;

  // Action handlers
  const handleReschedulePO = (poId: string) => {
    if (!newDeliveryDate) return;
    updatePurchaseOrder(poId, { deliveryDate: newDeliveryDate });
    addSystemNotification('info', 'PO Rescheduled', `PO #${purchaseOrders.find(po => po.id === poId)?.poNumber} rescheduled to ${newDeliveryDate}`);
    setShowRescheduleModal({ open: false, poId: '' });
    setNewDeliveryDate('');
    setAlerts(alerts.map((alert: Alert) => alert.affectedEntities.includes(poId) && alert.type === 'delivery_risk' ? { ...alert, isResolved: true } : alert));
  };

  const handleScheduleMaintenance = (machineId: string) => {
    if (!newMaintenanceDate) return;
    updateMachine(machineId, { status: 'maintenance', nextMaintenance: newMaintenanceDate });
    addSystemNotification('info', 'Maintenance Scheduled', `Maintenance for machine ${machines.find(m => m.id === machineId)?.machineName} scheduled on ${newMaintenanceDate}`);
    setShowMaintenanceModal({ open: false, machineId: '' });
    setNewMaintenanceDate('');
    setAlerts(alerts.map((alert: Alert) => alert.affectedEntities.includes(machineId) && alert.type === 'machine_breakdown' ? { ...alert, isResolved: true } : alert));
  };

  // Calculate total time to move
  const totalTimeToMove = scheduleItems.filter(item => selectedJobIds.includes(item.id)).reduce((sum, item) => sum + (item.allocatedTime || 0), 0);
  const newMachineLoad = newMaintenanceDate ? getMachineLoad(newMaintenanceDate) + totalTimeToMove : 0;
  const newMachineCapacity = newMaintenanceDate ? getMachineCapacity(newMaintenanceDate) : 0;
  const willOverload = newMachineCapacity > 0 && newMachineLoad > newMachineCapacity;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Critical Alerts
            </h1>
            {unresolvedCount > 0 && (
              <span className="px-3 py-1 bg-[#F24E1E]/10 text-[#F24E1E] text-sm font-bold rounded-full border border-[#F24E1E]/20 shadow-sm animate-pulse">
                {unresolvedCount} New
              </span>
            )}
          </div>
          <p className="text-gray-500">Monitor and resolve system notifications and warnings</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {unresolvedCount > 0 && (
            <button
              onClick={resolveAllAlerts}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:border-[#F24E1E] hover:text-[#F24E1E] transition-all shadow-sm font-medium"
            >
              <CheckCircle size={18} className="text-gray-400 group-hover:text-[#F24E1E] transition-colors" />
              Resolve All
            </button>
          )}
          <button
            onClick={clearResolvedAlerts}
            className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm font-medium"
          >
            <RefreshCw size={18} className="text-gray-400 group-hover:text-gray-600" />
            Clear Resolved
          </button>
        </div>
      </div>

      {/* Filters & Search Bar - Redesigned */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-8">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center p-2">

          {/* Left Side: Type Filters */}
          <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto no-scrollbar">
            <div className="flex bg-gray-100/80 p-1.5 rounded-xl gap-1">
              {['all', 'unresolved', 'delivery_risk', 'machine_breakdown', 'quality_issue', 'capacity_overload'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType as any)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${filter === filterType
                      ? 'bg-white text-[#F24E1E] shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                  `}
                >
                  {filterType === 'all' ? 'All Alerts' : filterType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Severity & Search */}
          <div className="flex items-center gap-4 w-full xl:w-auto border-t xl:border-t-0 border-gray-100 pt-4 xl:pt-0">

            {/* Severity Toggles */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Severity</span>
              <div className="flex gap-1">
                {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setSeverityFilter(severity as any)}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                      ${severityFilter === severity
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}
                    `}
                    title={severity.charAt(0).toUpperCase() + severity.slice(1)}
                  >
                    {severity === 'all' ? 'A' : severity.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 xl:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-[#F24E1E]/30 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#F24E1E]/10 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-500 max-w-sm text-center">
              {searchTerm ? 'No alerts match your search criteria.' : 'There are no active alerts requiring your attention at this moment.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div
                key={alert.id}
                className={`
                  group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                  ${alert.isResolved ? 'opacity-60 grayscale-[0.5]' : ''}
                `}
              >
                {/* Severity Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>

                <div className="p-5 pl-7 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        {getAlertIcon(alert.type)}
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {alert.isResolved ? (
                      <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} /> Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Message */}
                  <h3 className="text-base font-bold text-gray-900 mb-3 leading-tight line-clamp-2" title={alert.message}>
                    {alert.message}
                  </h3>

                  {/* Details */}
                  <div className="space-y-3 flex-1">
                    {alert.suggestedActions.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Suggested Action</p>
                        <ul className="space-y-1">
                          {alert.suggestedActions.slice(0, 2).map((action, idx) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                              <ArrowRight size={12} className="text-[#F24E1E] mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {alert.affectedEntities.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Affected</p>
                        <div className="flex flex-wrap gap-1.5">
                          {alert.affectedEntities.slice(0, 3).map((entity, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-[10px] font-medium shadow-sm">
                              {entity}
                            </span>
                          ))}
                          {alert.affectedEntities.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-medium">
                              +{alert.affectedEntities.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer / Actions */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>

                    {!alert.isResolved && (
                      <div className="flex gap-2">
                        {alert.type === 'delivery_risk' && (
                          <button
                            onClick={() => setShowRescheduleModal({ open: true, poId: alert.affectedEntities[0] })}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
                          >
                            Reschedule
                          </button>
                        )}
                        {alert.type === 'machine_breakdown' && (
                          <button
                            onClick={() => setShowMaintenanceModal({ open: true, machineId: alert.affectedEntities[0] })}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-xs font-semibold"
                          >
                            Fix
                          </button>
                        )}
                        {alert.type === 'capacity_overload' && (
                          <button
                            onClick={() => setShowRedistributeModal({ open: true, machineId: alert.affectedEntities[0] })}
                            className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-xs font-semibold"
                          >
                            Redistribute
                          </button>
                        )}

                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {/* Reschedule Modal */}
      {showRescheduleModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Calendar size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reschedule PO</h3>
                <p className="text-sm text-gray-500">Select a new delivery date</p>
              </div>
            </div>

            <input
              type="date"
              value={newDeliveryDate}
              onChange={e => setNewDeliveryDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setShowRescheduleModal({ open: false, poId: '' })}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-200"
                onClick={() => handleReschedulePO(showRescheduleModal.poId)}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Wrench size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Schedule Maintenance</h3>
                <p className="text-sm text-gray-500">Set next maintenance date</p>
              </div>
            </div>

            <input
              type="date"
              value={newMaintenanceDate}
              onChange={e => setNewMaintenanceDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                onClick={() => setShowMaintenanceModal({ open: false, machineId: '' })}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium transition-colors shadow-lg shadow-amber-200"
                onClick={() => handleScheduleMaintenance(showMaintenanceModal.machineId)}
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redistribute Modal */}
      {showRedistributeModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Zap size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Redistribute Jobs</h3>
                <p className="text-sm text-gray-500">Move jobs to balance capacity</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select Jobs to Move:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-1 bg-gray-50/50 custom-scrollbar">
                {scheduleItems.filter(item => item.machineId === showRedistributeModal.machineId).length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">No jobs found for this machine.</div>
                ) : (
                  scheduleItems.filter(item => item.machineId === showRedistributeModal.machineId).map(item => (
                    <label key={item.id} className="flex items-start gap-3 p-3 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(item.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedJobIds(ids => [...ids, item.id]);
                          else setSelectedJobIds(ids => ids.filter(id => id !== item.id));
                        }}
                        className="mt-1 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">PO #{purchaseOrders.find(po => po.id === item.poId)?.poNumber || 'N/A'}</span>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {getJobDetails(item)} • {item.quantity} pcs • {item.allocatedTime} min
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Target Machine:</p>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                value={newMaintenanceDate} // reuse state for selected machineId
                onChange={e => setNewMaintenanceDate(e.target.value)}
              >
                <option value="">Select a machine...</option>
                {machines.filter(m => m.id !== showRedistributeModal.machineId && m.status === 'active').map(m => {
                  const load = getMachineLoad(m.id);
                  const capacity = getMachineCapacity(m.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.machineName} (Load: {Math.round((load / capacity) * 100)}%)
                    </option>
                  );
                })}
              </select>

              {newMaintenanceDate && (
                <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${willOverload ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {willOverload ? <AlertOctagon size={16} /> : <CheckCircle size={16} />}
                  {willOverload
                    ? `Warning: Overload risk (${newMachineLoad}m > ${newMachineCapacity}m)`
                    : `Projected Load: ${newMachineLoad}m / ${newMachineCapacity}m`}
                </div>
              )}
            </div>

            {redistributeError && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {redistributeError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                onClick={() => {
                  setShowRedistributeModal({ open: false, machineId: '' });
                  setSelectedJobIds([]);
                  setRedistributeError('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium transition-colors shadow-lg shadow-orange-200"
                onClick={() => {
                  const oldMachineId = showRedistributeModal.machineId;
                  const newMachineId = newMaintenanceDate;
                  if (!newMachineId) {
                    setRedistributeError('Please select a target machine.');
                    return;
                  }
                  if (selectedJobIds.length === 0) {
                    setRedistributeError('Please select at least one job to move.');
                    return;
                  }
                  if (willOverload) {
                    setRedistributeError('Target machine will be overloaded.');
                    return;
                  }

                  setRedistributeError('');
                  setScheduleItems(scheduleItems.map(item =>
                    selectedJobIds.includes(item.id) ? { ...item, machineId: newMachineId } : item
                  ));

                  addSystemNotification('info', 'Jobs Redistributed', `Moved ${selectedJobIds.length} jobs to ${machines.find(m => m.id === newMachineId)?.machineName}.`);

                  // Mark alert as resolved
                  setAlerts(alerts.map((alert: Alert) => alert.affectedEntities.includes(oldMachineId) && alert.type === 'capacity_overload' ? { ...alert, isResolved: true } : alert));

                  setShowRedistributeModal({ open: false, machineId: '' });
                  setNewMaintenanceDate('');
                  setSelectedJobIds([]);

                  // Auto-optimize schedule
                  setTimeout(() => {
                    setScheduleItems(optimizeSchedule(scheduleItems.map(item =>
                      selectedJobIds.includes(item.id) ? { ...item, machineId: newMachineId } : item
                    ), machines, products));
                  }, 100);
                }}
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;