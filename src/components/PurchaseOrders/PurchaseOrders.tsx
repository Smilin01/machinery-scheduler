import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { PurchaseOrder } from '../../types';
import { checkDeliveryFeasibility, generateScheduleWithConflicts } from '../../utils/scheduling';
import { Plus, Edit2, Trash2, Save, X, AlertTriangle, CheckCircle, Info, Copy, Clock } from 'lucide-react';
import { ScheduleConflict, getAutoPOStatus } from '../../utils/scheduling';

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders, products, machines, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, shifts, updateMachine, setScheduleItems, scheduleItems, holidays, addSystemNotification } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    poNumber: '',
    poDate: new Date().toISOString().split('T')[0],
    productId: '',
    quantity: 0,
    deliveryDate: '',
    remarks: '',
    status: 'pending',
    priority: 'medium', // default
  });
  const [feasibilityCheck, setFeasibilityCheck] = useState<{
    feasible: boolean;
    message: string;
    suggestedDate?: string;
  } | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingPO, setPendingPO] = useState<PurchaseOrder | null>(null);
  const [showMachinePOs, setShowMachinePOs] = useState<{ machineId: string, open: boolean }>({ machineId: '', open: false });
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState<{
    open: boolean;
    machines: Array<{ id: string; name: string; status: string; }>;
  }>({ open: false, machines: [] });


  // Handle toast notifications
  React.useEffect(() => {
    const handler = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  const autoCalculatePriority = (deliveryDate: string) => {
    if (!deliveryDate) return 'medium';
    const days = (new Date(deliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'high';
    if (days <= 14) return 'medium';
    return 'low';
  };

  const getPOOvertimeInfo = (poId: string) => {
    const poScheduleItems = scheduleItems.filter(item => item.poId === poId);
    const totalOvertimeHours = poScheduleItems.reduce((total, item) => {
      return total + (item.actualOvertimeHours || 0);
    }, 0);
    const overtimeRecords = poScheduleItems.reduce((total, item) => {
      return total + (item.overtimeRecords?.length || 0);
    }, 0);
    return { totalOvertimeHours, overtimeRecords };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priority = formData.priority || autoCalculatePriority(formData.deliveryDate || '');
    const newPO: PurchaseOrder = {
      id: editingId || crypto.randomUUID(),
      poNumber: formData.poNumber || '',
      poDate: formData.poDate || new Date().toISOString().split('T')[0],
      productId: formData.productId || '',
      quantity: formData.quantity || 0,
      deliveryDate: formData.deliveryDate || '',
      remarks: formData.remarks || '',
      status: formData.status || 'pending',
      customerName: formData.customerName || '',
      customerContact: formData.customerContact || '',
      urgencyLevel: formData.urgencyLevel || 'normal',
      specialInstructions: formData.specialInstructions || '',
      estimatedValue: formData.estimatedValue || 0,
      qualityApproved: formData.qualityApproved || false,
      priority,
    };
    // Check for machine conflicts using generateScheduleWithConflicts
    const { conflicts } = generateScheduleWithConflicts(
      [...purchaseOrders, newPO],
      products,
      machines,
      shifts,
      holidays
    );
    const relevantConflicts = conflicts.filter(c => c.newPO.id === newPO.id);
    if (relevantConflicts.length > 0) {
      setConflicts(relevantConflicts);
      setPendingPO(newPO);
      setShowConflictModal(true);
      return;
    }
    if (editingId) {
      updatePurchaseOrder(editingId, { ...formData, priority });
      setEditingId(null);
    } else {
      addPurchaseOrder(newPO);
      // Auto-generate schedule after adding new PO
      setIsGeneratingSchedule(true);
      setTimeout(() => {
        const { schedule: newSchedule } = generateScheduleWithConflicts(
          [...purchaseOrders, newPO],
          products,
          machines,
          shifts,
          holidays
        );
        const mergedSchedule = newSchedule.map(newItem => {
          const prevItem = scheduleItems.find(item => item.id === newItem.id);
          if (prevItem && (prevItem.status === 'in-progress' || prevItem.status === 'completed')) {
            return {
              ...newItem,
              status: prevItem.status,
              startDate: prevItem.startDate,
              endDate: prevItem.endDate,
              actualStartTime: prevItem.actualStartTime,
              actualEndTime: prevItem.actualEndTime
            };
          }
          return newItem;
        });
        setScheduleItems(mergedSchedule);
        addSystemNotification('success', 'Schedule Generated', `Schedule for PO ${newPO.poNumber} generated successfully.`);
        setIsGeneratingSchedule(false);
      }, 100);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      poNumber: '',
      poDate: new Date().toISOString().split('T')[0],
      productId: '',
      quantity: 0,
      deliveryDate: '',
      remarks: '',
      status: 'pending',
      priority: 'medium',
    });
    setIsAdding(false);
    setEditingId(null);
    setFeasibilityCheck(null);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setFormData(po);
    setEditingId(po.id);
    setIsAdding(true);
  };

  const handleDuplicate = (po: PurchaseOrder) => {
    const duplicated: PurchaseOrder = {
      ...po,
      id: crypto.randomUUID(),
      poNumber: po.poNumber + '-COPY',
      status: 'pending' as const, // Always set status to pending for copied purchase orders
    };
    setFormData(duplicated);
    setIsAdding(true);
    setEditingId(null);
  };

  const handleProductChange = (productId: string) => {
    setFormData(prev => ({ ...prev, productId }));
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({ ...prev, partNumber: product.partNumber }));

      // Check for machines in maintenance
      const maintenanceMachines = product.processFlow
        .map(step => {
          const machine = machines.find(m => m.id === step.machineId);
          return machine && (machine.status === 'maintenance' || machine.status === 'breakdown')
            ? { id: machine.id, name: machine.machineName, status: machine.status }
            : null;
        })
        .filter(Boolean);

      if (maintenanceMachines.length > 0) {
        setShowMaintenanceWarning({
          open: true,
          machines: maintenanceMachines as Array<{ id: string; name: string; status: string; }>
        });
      }
    }
  };

  const checkFeasibility = () => {
    if (!formData.poDate || isNaN(new Date(formData.poDate).getTime()) || !formData.deliveryDate || isNaN(new Date(formData.deliveryDate).getTime())) {
      setFeasibilityCheck({
        feasible: false,
        message: 'Please enter a valid PO Date and Delivery Date.'
      });
      return;
    }
    if (formData.productId && formData.quantity && formData.deliveryDate) {
      const product = products.find(p => p.id === formData.productId);
      if (product) {
        const tempPO: PurchaseOrder = {
          id: 'temp',
          poNumber: formData.poNumber || '',
          poDate: formData.poDate || new Date().toISOString().split('T')[0],
          productId: formData.productId,
          quantity: formData.quantity,
          deliveryDate: formData.deliveryDate,
          remarks: formData.remarks || '',
          status: 'pending',
          customerName: formData.customerName || '',
          customerContact: formData.customerContact || '',
          urgencyLevel: formData.urgencyLevel || 'normal',
          specialInstructions: formData.specialInstructions || '',
          estimatedValue: formData.estimatedValue || 0,
          qualityApproved: formData.qualityApproved || false,
          priority: formData.priority || autoCalculatePriority(formData.deliveryDate),
        };

        // First check for machine conflicts
        const { conflicts } = generateScheduleWithConflicts(
          [...purchaseOrders, tempPO],
          products,
          machines,
          shifts,
          holidays
        );
        const relevantConflicts = conflicts.filter(c => c.newPO.id === tempPO.id);

        if (relevantConflicts.length > 0) {
          setConflicts(relevantConflicts);
          setPendingPO(tempPO);
          setShowConflictModal(true);
          setFeasibilityCheck({
            feasible: false,
            message: 'Machine conflict detected. Please resolve the conflict to proceed.'
          });
          return;
        }

        // Now check delivery feasibility with existing schedule
        const result = checkDeliveryFeasibility(
          tempPO,
          product,
          machines,
          shifts,
          holidays,
          scheduleItems // Pass existing schedule items
        );

        setFeasibilityCheck({
          feasible: result.feasible,
          message: result.message,
          suggestedDate: result.suggestedDate
        });
      }
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper: Get all active POs using a machine
  const getActivePOsForMachine = (machineId: string) => {
    // Find all products that use this machine
    const productIds = products.filter(p => p.processFlow.some(step => step.machineId === machineId)).map(p => p.id);
    // Find all active POs for those products, using dynamic status
    return purchaseOrders.filter(po =>
      productIds.includes(po.productId) &&
      getAutoPOStatus(po, scheduleItems) !== 'completed' &&
      getAutoPOStatus(po, scheduleItems) !== 'cancelled'
    );
  };

  // When deleting a PO, update machine status if needed
  const handleDeletePO = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return deletePurchaseOrder(poId);
    const product = products.find(p => p.id === po.productId);
    if (product) {
      product.processFlow.forEach(step => {
        const machineId = step.machineId;
        // Check if this machine is used by any other active PO
        const stillUsed = purchaseOrders.some(otherPO =>
          otherPO.id !== poId &&
          otherPO.status !== 'completed' &&
          otherPO.status !== 'cancelled' &&
          products.find(p => p.id === otherPO.productId)?.processFlow.some(s => s.machineId === machineId)
        );
        if (!stillUsed) {
          // Set machine status to 'idle' (truly unassigned)
          updateMachine(machineId, { status: 'idle' });
        }
      });
    }
    deletePurchaseOrder(poId);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-semibold transition-all animate-fade-in ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Purchase Orders</h1>
          <p className="text-gray-600">Manage production orders and delivery schedules</p>
          {isGeneratingSchedule && (
            <div className="mt-2 flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Generating schedule...</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Purchase Order
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? 'Edit Purchase Order' : 'Add New Purchase Order'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Date
                </label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.productName} ({product.partNumber})
                    </option>
                  ))}
                </select>
              </div>
              {/* Show required machines for selected product, with info button */}
              {formData.productId && (
                <div className="col-span-2 mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Machines Required for Product:</label>
                  <div className="flex flex-wrap gap-2">
                    {products.find(p => p.id === formData.productId)?.processFlow.map(step => {
                      const machine = machines.find(m => m.id === step.machineId);
                      if (!machine) return null;
                      return (
                        <span key={machine.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold bg-cyan-50 border-cyan-200 text-cyan-700">
                          {machine.machineName}
                          <button
                            type="button"
                            className="ml-1 text-blue-500 hover:text-blue-700"
                            onClick={() => setShowMachinePOs({ machineId: machine.id, open: true })}
                            title="Show POs using this machine"
                          >
                            <Info size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as PurchaseOrder['status'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as PurchaseOrder['priority'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from delivery date, but can be overridden.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={checkFeasibility}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              >
                Check Feasibility
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                {editingId ? 'Update' : 'Add'} Purchase Order
              </button>
            </div>

            {feasibilityCheck && (
              <div className={`p-4 rounded-md ${feasibilityCheck.feasible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {feasibilityCheck.feasible ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <AlertTriangle className="text-red-600" size={20} />
                  )}
                  <p className={`font-medium ${feasibilityCheck.feasible ? 'text-green-800' : 'text-red-800'}`}>
                    {feasibilityCheck.message}
                  </p>
                </div>
                {feasibilityCheck.suggestedDate && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, deliveryDate: feasibilityCheck.suggestedDate }))}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    Use Suggested Date
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto p-8 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-blue-900">Machine Conflict Detected</h3>
                <span className="ml-2 text-blue-500" title="A higher-priority PO needs a machine already scheduled for another PO. You can resolve this by extending the lower-priority PO's end date.">ℹ️</span>
              </div>
              <button
                onClick={() => setShowConflictModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-lg font-bold ${pendingPO?.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  pendingPO?.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    pendingPO?.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                }`}>
                {pendingPO?.priority?.toUpperCase()}
              </span>
              <span className="font-semibold text-blue-800">New PO: {pendingPO?.poNumber}</span>
              <span className="text-gray-500">({pendingPO?.deliveryDate})</span>
            </div>
            <div className="mb-4">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Conflicting PO</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Delivery Date</th>
                    <th className="px-3 py-2 text-left">Machine</th>
                    <th className="px-3 py-2 text-left">Current End</th>
                    <th className="px-3 py-2 text-left">Proposed End</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((conflict, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2 font-semibold text-blue-700">{conflict.conflictingPO.poNumber}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${conflict.conflictingPO.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            conflict.conflictingPO.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              conflict.conflictingPO.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                          }`}>
                          {conflict.conflictingPO.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2">{conflict.conflictingPO.deliveryDate}</td>
                      <td className="px-3 py-2 font-medium text-indigo-700">{machines.find(m => m.id === conflict.machineId)?.machineName}</td>
                      <td className="px-3 py-2">{new Date(conflict.conflictingScheduleItem.endDate).toLocaleString()}</td>
                      <td className="px-3 py-2 text-blue-700 font-semibold">{new Date(conflict.newScheduleItem.endDate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-gray-700 text-sm mb-6 flex items-center gap-2">
              <span className="font-semibold text-blue-700">What happens if you resolve?</span>
              <span className="text-gray-500">The lower-priority PO(s) will be rescheduled to start after the new PO is completed. This ensures urgent work is prioritized.</span>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Simple resolution: push conflicting PO's delivery date after newPO's end
                  if (!pendingPO) return;
                  conflicts.forEach(conflict => {
                    updatePurchaseOrder(conflict.conflictingPO.id, {
                      deliveryDate: conflict.newScheduleItem.endDate,
                      remarks: (conflict.conflictingPO.remarks || '') + ' [Rescheduled due to higher-priority PO]'
                    });
                  });
                  addPurchaseOrder(pendingPO);
                  // Auto-generate schedule after resolving conflict and adding PO
                  setIsGeneratingSchedule(true);
                  setTimeout(() => {
                    const { schedule: newSchedule } = generateScheduleWithConflicts(
                      purchaseOrders,
                      products,
                      machines,
                      shifts,
                      holidays
                    );
                    // Preserve existing progress for in-progress/completed items
                    const mergedSchedule = newSchedule.map(newItem => {
                      const prevItem = scheduleItems.find(item => item.id === newItem.id);
                      if (prevItem && (prevItem.status === 'in-progress' || prevItem.status === 'completed')) {
                        return {
                          ...newItem,
                          status: prevItem.status,
                          startDate: prevItem.startDate,
                          endDate: prevItem.endDate,
                          actualStartTime: prevItem.actualStartTime,
                          actualEndTime: prevItem.actualEndTime
                        };
                      }
                      return newItem;
                    });
                    setScheduleItems(mergedSchedule);
                    addSystemNotification('success', 'Schedule Generated', `Schedule for PO ${pendingPO.poNumber} generated successfully.`);
                    setIsGeneratingSchedule(false);
                  }, 100);
                  setShowConflictModal(false);
                  setConflicts([]);
                  setPendingPO(null);
                  resetForm();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold shadow-md"
              >
                Resolve Conflict & Add PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine POs Modal */}
      {showMachinePOs.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 border-2 border-cyan-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cyan-800">POs using this machine</h3>
              <button
                onClick={() => setShowMachinePOs({ machineId: '', open: false })}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-cyan-50">
                  <tr>
                    <th className="px-3 py-2 text-left">PO Number</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Delivery Date</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getActivePOsForMachine(showMachinePOs.machineId).map(po => {
                    const product = products.find(p => p.id === po.productId);
                    return (
                      <tr key={po.id}>
                        <td className="px-3 py-2 font-semibold text-blue-700">{po.poNumber}</td>
                        <td className="px-3 py-2">{product?.productName || 'Unknown'}</td>
                        <td className="px-3 py-2">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(po.status)}`}>{po.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {getActivePOsForMachine(showMachinePOs.machineId).length === 0 && (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-4">No active POs using this machine.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Machine Maintenance Warning Modal */}
      {showMaintenanceWarning.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-4 border-amber-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-amber-700 mb-2">Machine Maintenance Warning</h2>
              <p className="text-gray-700 mb-4">
                The following machines required for this product are currently in maintenance or breakdown status.
                You need to change their status to 'active' before proceeding.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {showMaintenanceWarning.machines.map(machine => (
                <div key={machine.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${machine.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                      {machine.status.toUpperCase()}
                    </span>
                    <span className="font-semibold text-gray-800">{machine.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      updateMachine(machine.id, { status: 'active' });
                      // Remove this machine from the warning list
                      setShowMaintenanceWarning(prev => ({
                        ...prev,
                        machines: prev.machines.filter(m => m.id !== machine.id)
                      }));
                      // Close modal if no more maintenance machines
                      if (showMaintenanceWarning.machines.length === 1) {
                        setShowMaintenanceWarning({ open: false, machines: [] });
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Set to Active
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowMaintenanceWarning({ open: false, machines: [] })}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.map((po) => {
                const product = products.find(p => p.id === po.productId);
                // Get the auto status for this PO
                const autoStatus = getAutoPOStatus(po, scheduleItems || []);
                const overtimeInfo = getPOOvertimeInfo(po.id);
                return (
                  <tr key={po.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product ? `${product.productName} (${product.partNumber})` : 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(po.poDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(po.deliveryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(autoStatus)}`}>
                        {autoStatus}
                      </span>
                      {/* Force Complete button for delayed POs */}
                      {autoStatus === 'delayed' && (
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          onClick={() => {
                            // Set PO to completed
                            updatePurchaseOrder(po.id, { status: 'completed' });
                            // Set all related schedule items to completed
                            setScheduleItems(scheduleItems.map(item =>
                              item.poId === po.id ? { ...item, status: 'completed', actualEndTime: new Date().toISOString() } : item
                            ));
                          }}
                          title="Force Complete (Staff override)"
                        >
                          Force Complete
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(po.priority)}`}>
                        {po.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {overtimeInfo.totalOvertimeHours > 0 ? (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock size={14} />
                          <span className="font-medium">{overtimeInfo.totalOvertimeHours.toFixed(1)}h</span>
                          <span className="text-xs text-gray-500">({overtimeInfo.overtimeRecords} records)</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No overtime</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(po)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(po)}
                          className="text-emerald-600 hover:text-emerald-800"
                          title="Duplicate Purchase Order"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePO(po.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;