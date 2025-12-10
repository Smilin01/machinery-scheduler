import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getDashboardMetrics, generateAlerts, getPOTimeProgress, getAutoPOStatus } from '../../utils/scheduling';
import {
  CheckCircle,
  AlertTriangle,
  Package,
  Award,
  Activity,
  Settings,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Machine } from '../../types';

const Dashboard: React.FC = () => {
  const { purchaseOrders, machines, products, scheduleItems } = useApp();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(getDashboardMetrics(purchaseOrders, scheduleItems, machines));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [alerts, setAlerts] = useState(generateAlerts(purchaseOrders, machines, scheduleItems));
  const [greeting, setGreeting] = useState('');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMachineDetails, setSelectedMachineDetails] = useState<Machine | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    setMetrics(getDashboardMetrics(purchaseOrders, scheduleItems, machines));
    setAlerts(generateAlerts(purchaseOrders, machines, scheduleItems));
  }, [purchaseOrders, machines, scheduleItems]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered lists
  const filteredOrders = purchaseOrders
    .filter(po => statusFilter === 'all' || po.status === statusFilter)
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 5);

  const machineStatusList = machines.map(m => ({
    ...m,
    currentLoad: Math.floor(Math.random() * 100) // Mock load data for now
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'delayed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getMachineStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'maintenance': return 'bg-amber-500';
      case 'breakdown': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    description?: string;
  }> = ({ title, value, icon: Icon, color, suffix = '', trend, trendValue, description }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 group-hover:scale-105 transition-transform duration-300`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-green-50 text-green-700' :
            trend === 'down' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-600'
            }`}>
            {trend === 'up' ? <ArrowUp size={12} /> :
              trend === 'down' ? <ArrowDown size={12} /> :
                <Minus size={12} />}
            <span>{Math.abs(trendValue)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}{suffix}</p>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, Admin
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening in your production today.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock size={18} className="text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={Package}
          color="text-blue-600 bg-blue-600"
          trend="up"
          trendValue={12}
          description="Active orders"
        />
        <MetricCard
          title="On-Time"
          value={metrics.onTimeOrders}
          icon={CheckCircle}
          color="text-green-600 bg-green-600"
          trend="up"
          trendValue={8}
          description="On schedule"
        />
        <MetricCard
          title="Delayed"
          value={metrics.delayedOrders}
          icon={AlertTriangle}
          color="text-red-600 bg-red-600"
          trend="down"
          trendValue={5}
          description="Behind schedule"
        />
        <MetricCard
          title="Utilization"
          value={metrics.machineUtilization.toFixed(1)}
          icon={Activity}
          color="text-purple-600 bg-purple-600"
          suffix="%"
          trend="up"
          trendValue={3}
          description="Efficiency"
        />
        <MetricCard
          title="Revenue"
          value={`$${(metrics.revenue / 1000).toFixed(1)}K`}
          icon={DollarSign}
          color="text-emerald-600 bg-emerald-600"
          trend="up"
          trendValue={15}
          description="Today"
        />
        <MetricCard
          title="Quality"
          value={metrics.qualityScore.toFixed(1)}
          icon={Award}
          color="text-amber-600 bg-amber-600"
          suffix="%"
          trend="neutral"
          trendValue={0}
          description="Score"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                setMetrics(getDashboardMetrics(purchaseOrders, scheduleItems, machines));
                setAlerts(generateAlerts(purchaseOrders, machines, scheduleItems));
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((po) => {
                    const product = products.find(p => p.id === po.productId);
                    const progress = getPOTimeProgress(po.id, scheduleItems);
                    const autoStatus = getAutoPOStatus(po, scheduleItems);

                    return (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {po.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <button
                            onClick={() => product && setSelectedProduct(product)}
                            className="hover:text-blue-600 hover:underline text-left"
                          >
                            {product?.productName || 'Unknown Product'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {po.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(po.deadline).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(autoStatus)}`}>
                            {autoStatus.charAt(0).toUpperCase() + autoStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${progress >= 100 ? 'bg-emerald-500' :
                                progress > 80 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400 mt-1 inline-block">{Math.round(progress)}%</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No orders found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Machine Status</h2>
            <button
              onClick={() => navigate('/master-data')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {machineStatusList.map((machine) => (
              <div key={machine.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm absolute -right-0.5 -bottom-0.5 ${getMachineStatusColor(machine.status)}`}></div>
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Settings size={20} />
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setSelectedMachineDetails(machine)}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left block"
                    >
                      {machine.machineName}
                    </button>
                    <p className="text-xs text-gray-500">{machine.machineType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md ${machine.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    machine.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                    {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{machine.currentLoad}% Load</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{selectedProduct.productName}</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                <Minus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Part Number</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedProduct.partNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Category</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedProduct.category || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Material</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedProduct.specifications.material || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Est. Cost</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(selectedProduct.estimatedCost)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Process Flow</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.processFlow.map((step, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium border border-blue-100">
                      {idx + 1}. {step.stepName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine Details Modal */}
      {selectedMachineDetails && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedMachineDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{selectedMachineDetails.machineName}</h3>
              <button onClick={() => setSelectedMachineDetails(null)} className="text-gray-400 hover:text-gray-600">
                <Minus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedMachineDetails.machineType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-md ${selectedMachineDetails.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    selectedMachineDetails.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                    {selectedMachineDetails.status.charAt(0).toUpperCase() + selectedMachineDetails.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedMachineDetails.location || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Efficiency</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedMachineDetails.efficiency}%</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Shift Timing</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-block">
                  <Clock size={14} className="inline mr-1 text-gray-400" />
                  {selectedMachineDetails.shiftTiming}
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedMachineDetails(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;