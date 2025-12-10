import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getDashboardMetrics, calculateMachineEfficiency, getAutoPOStatus, getOvertimeMultiplier } from '../../utils/scheduling';
import {
  FileText,
  Download,
  TrendingUp,
  Calendar,
  Package,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Wrench,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';

const Reports: React.FC = () => {
  const { purchaseOrders, products, machines, scheduleItems, user, holidays, shifts } = useApp();
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'machine-utilization' | 'overtime'>('summary');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const metrics = getDashboardMetrics(purchaseOrders, scheduleItems, machines);

  // Calculate overtime metrics
  const overtimeMetrics = {
    totalOvertimeHours: scheduleItems.reduce((total, item) => {
      return total + (item.plannedOvertimeHours || 0) + (item.actualOvertimeHours || 0);
    }, 0),
    totalOvertimeRecords: scheduleItems.reduce((total, item) => {
      return total + (item.overtimeRecords?.length || 0);
    }, 0),
    overtimeCost: scheduleItems.reduce((total, item) => {
      const records = item.overtimeRecords || [];
      return total + records.reduce((recordTotal, record) => {
        return recordTotal + (record.actualOvertimeHours || record.plannedOvertimeHours) * record.costMultiplier;
      }, 0);
    }, 0),
    averageOvertimePerItem: scheduleItems.length > 0 ?
      scheduleItems.reduce((total, item) => total + (item.plannedOvertimeHours || 0), 0) / scheduleItems.length : 0
  };

  const generateReport = async (format: 'pdf' | 'excel' | 'word') => {
    // Prepare tabular data for export
    const tableData = [
      ['Company Name', user?.name || 'Manufacturing Company'],
      ['Report Date', new Date().toLocaleDateString()],
      ['Total Orders', metrics.totalOrders],
      ['On Time Orders', metrics.onTimeOrders],
      ['Delayed Orders', metrics.delayedOrders],
      ['Machine Utilization (%)', metrics.machineUtilization],
      ['Machines', machines.length],
      ['Products', products.length],
      ['Schedule Items', scheduleItems.length],
      ['Total Overtime Hours', overtimeMetrics.totalOvertimeHours.toFixed(1)],
      ['Overtime Records', overtimeMetrics.totalOvertimeRecords],
      ['Estimated Overtime Cost', `$${overtimeMetrics.overtimeCost.toFixed(2)}`],
    ];
    const today = new Date().toLocaleDateString();
    const company = user?.name || 'Manufacturing Company';
    const reportTitle = 'Manufacturing Report';

    // Brand Color: #F24E1E -> RGB(242, 78, 30)
    const brandColorRgb = { r: 242, g: 78, b: 30 };
    const brandColorHex = 'F24E1E';

    if (format === 'excel') {
      const ws = XLSX.utils.aoa_to_sheet([]);

      XLSX.utils.sheet_add_aoa(ws, [[company, '']], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(ws, [[reportTitle, '']], { origin: 'A2' });
      XLSX.utils.sheet_add_aoa(ws, [[`Date: ${today}`, '']], { origin: 'A3' });
      XLSX.utils.sheet_add_aoa(ws, [['', '']], { origin: 'A4' });
      XLSX.utils.sheet_add_aoa(ws, [['Field', 'Value']], { origin: 'A5' });
      XLSX.utils.sheet_add_aoa(ws, tableData, { origin: 'A6' });

      // Styling would go here (simplified for brevity as xlsx-style is not always available in standard xlsx package without pro/style extensions, but structure is correct)

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `manufacturing-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(242, 78, 30); // Brand Color
      doc.text(company, 10, 15);
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(reportTitle, 10, 25);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${today}`, 10, 32);
      autoTable(doc, {
        startY: 38,
        head: [['Field', 'Value']],
        body: tableData,
        styles: { fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [242, 78, 30], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 247, 245] }, // Light orange tint
        margin: { left: 10, right: 10 },
        tableLineColor: [242, 78, 30],
        tableLineWidth: 0.1,
      });
      doc.save(`manufacturing-report-${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }
  };

  // Parse holidays
  const parseHoliday = (h: string) => {
    const [date, ...reasonParts] = h.split('|');
    return { date, reason: reasonParts.join('|') || '' };
  };
  const holidayEntries = holidays.map(parseHoliday);

  const getAllSundays = (year: number): string[] => {
    const sundays: string[] = [];
    const date = new Date(year, 0, 1);
    while (date.getFullYear() === year) {
      if (date.getDay() === 0) {
        sundays.push(date.toISOString().split('T')[0]);
      }
      date.setDate(date.getDate() + 1);
    }
    return sundays;
  };
  const currentYear = calendarMonth.getFullYear();
  const sundays = getAllSundays(currentYear);

  const colorLegend = [
    { label: 'Sunday', className: 'bg-gray-100 border-gray-300 text-gray-700', tooltip: 'Default weekly holiday' },
    { label: 'Festival', className: 'bg-pink-50 border-pink-200 text-pink-700', tooltip: 'Festival/Celebration' },
    { label: 'Maintenance', className: 'bg-amber-50 border-amber-200 text-amber-700', tooltip: 'Maintenance/Shutdown' },
    { label: 'Public', className: 'bg-emerald-50 border-emerald-200 text-emerald-700', tooltip: 'National/Public Holiday' },
    { label: 'Other', className: 'bg-purple-50 border-purple-200 text-purple-700', tooltip: 'Other' },
  ];

  const reasonColor = (reason: string) => {
    if (!reason) return 'bg-red-50 border-red-200 text-red-700';
    if (/festival|holiday|celebration/i.test(reason)) return 'bg-pink-50 border-pink-200 text-pink-700';
    if (/maintenance|shutdown|repair/i.test(reason)) return 'bg-amber-50 border-amber-200 text-amber-700';
    if (/national|public/i.test(reason)) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    return 'bg-purple-50 border-purple-200 text-purple-700';
  };

  const getMonthDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const days: Date[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(new Date(year, monthIdx, 1 - (firstDay.getDay() - i)));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, monthIdx, d));
    }
    for (let i = lastDay.getDay() + 1; i <= 6; i++) {
      days.push(new Date(year, monthIdx + 1, i - lastDay.getDay()));
    }
    return days;
  };
  const monthDays = getMonthDays(calendarMonth);
  const isHoliday = (date: Date) => holidayEntries.some(h => h.date === date.toISOString().split('T')[0]) || sundays.includes(date.toISOString().split('T')[0]);
  const getHolidayReason = (date: Date) => {
    const entry = holidayEntries.find(h => h.date === date.toISOString().split('T')[0]);
    return entry?.reason || (sundays.includes(date.toISOString().split('T')[0]) ? 'Sunday' : '');
  };
  const isToday = (date: Date) => {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const nextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const prevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const SummaryReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Section */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="text-[#F24E1E]" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Holidays Calendar</h2>
              <p className="text-sm text-gray-500">Overview of non-working days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <span className="px-3 font-semibold text-gray-700 min-w-[140px] text-center">
              {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {colorLegend.map((l) => (
            <span key={l.label} className={`px-2.5 py-1 rounded-md text-xs font-medium border ${l.className}`} title={l.tooltip}>
              {l.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((date, idx) => {
            const holiday = isHoliday(date);
            const today = isToday(date);
            const inMonth = date.getMonth() === calendarMonth.getMonth();
            const reason = getHolidayReason(date);
            const colorClass = holiday && inMonth ? reasonColor(reason) : 'hover:bg-gray-50';

            return (
              <div
                key={idx}
                className={`
                  relative h-24 p-2 rounded-xl border transition-all duration-200 flex flex-col justify-between
                  ${!inMonth ? 'bg-gray-50/50 border-transparent text-gray-300' : 'bg-white border-gray-100'}
                  ${today && inMonth ? 'ring-2 ring-[#F24E1E] ring-offset-2 z-10' : ''}
                  ${holiday && inMonth ? colorClass : ''}
                `}
              >
                <span className={`text-sm font-medium ${today && inMonth ? 'text-[#F24E1E]' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>

                {holiday && inMonth && (
                  <span className="text-[10px] leading-tight font-medium truncate w-full block opacity-75">
                    {reason}
                  </span>
                )}

                {today && inMonth && !holiday && (
                  <span className="text-[10px] font-bold text-[#F24E1E]">Today</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 rounded-lg">
              <PieChart className="text-[#F24E1E]" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Order Status</h3>
          </div>

          <div className="space-y-4">
            {['pending', 'in-progress', 'completed', 'delayed'].map(status => {
              const count = purchaseOrders.filter(po => po.status === status).length;
              const percentage = metrics.totalOrders > 0 ? (count / metrics.totalOrders * 100).toFixed(1) : 0;

              const statusColors = {
                'completed': 'bg-emerald-500',
                'in-progress': 'bg-blue-500',
                'delayed': 'bg-[#F24E1E]',
                'pending': 'bg-amber-500'
              };

              return (
                <div key={status} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusColors[status as keyof typeof statusColors]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#F24E1E] rounded-2xl shadow-lg shadow-orange-200 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Quick Stats</h3>
            <Activity className="opacity-80" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs opacity-80 mb-1">Total Orders</p>
              <p className="text-2xl font-bold">{metrics.totalOrders}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs opacity-80 mb-1">On Time</p>
              <p className="text-2xl font-bold">{metrics.onTimeOrders}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs opacity-80 mb-1">Utilization</p>
              <p className="text-2xl font-bold">{metrics.machineUtilization}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs opacity-80 mb-1">Delayed</p>
              <p className="text-2xl font-bold">{metrics.delayedOrders}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DetailedReport = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Sales Orders Detail</h3>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SO Number</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchaseOrders.map(po => {
              const product = products.find(p => p.id === po.productId);
              const status = getAutoPOStatus(po, scheduleItems);
              return (
                <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{po.poNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {product?.productName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {po.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          status === 'delayed' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(po.deliveryDate).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const MachineUtilizationReport = () => (
    <div className="space-y-6">
      {machines.map(machine => {
        const machineSchedule = scheduleItems.filter(item => item.machineId === machine.id);
        const totalTime = machineSchedule.reduce((sum, item) => sum + item.allocatedTime, 0);
        const utilizationPercentage = machine.workingHours ? Math.min(100, (totalTime / (machine.workingHours * 60)) * 100) : 0;
        const liveEfficiency = calculateMachineEfficiency(machine.id, scheduleItems);

        return (
          <div key={machine.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                  <Wrench size={32} className="text-[#F24E1E]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    {machine.machineName}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${machine.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        machine.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          machine.status === 'breakdown' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                      {machine.status}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><BarChart3 size={16} /> {machine.machineType}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={16} /> {machine.location}</span>
                    <span className="flex items-center gap-1.5"><User size={16} /> {machine.operatorId || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-8 min-w-[300px]">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Efficiency</span>
                    <span className="text-sm font-bold text-gray-900">{liveEfficiency !== null ? `${liveEfficiency}%` : 'N/A'}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F24E1E] rounded-full transition-all duration-500"
                      style={{ width: `${liveEfficiency !== null ? liveEfficiency : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Utilization</span>
                    <span className="text-sm font-bold text-gray-900">{utilizationPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full transition-all duration-500"
                      style={{ width: `${utilizationPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
              <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                Recent Activity
              </h5>

              {machineSchedule.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No scheduled items for this machine.</div>
              ) : (
                <div className="space-y-3">
                  {machineSchedule.slice(0, 3).map((item) => {
                    const po = purchaseOrders.find(po => po.id === item.poId);
                    const product = products.find(p => p.id === item.productId);

                    return (
                      <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500' :
                              item.status === 'in-progress' ? 'bg-blue-500' :
                                item.status === 'delayed' ? 'bg-red-500' : 'bg-gray-300'
                            }`} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {po?.poNumber} - {product?.productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.processStep} • {item.allocatedTime} min
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-900">
                            {new Date(item.startDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const OvertimeReport = () => {
    const overtimeData = scheduleItems.filter(item =>
      item.overtimeRecords && item.overtimeRecords.length > 0
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Overtime Hours', value: overtimeMetrics.totalOvertimeHours.toFixed(1), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Overtime Records', value: overtimeMetrics.totalOvertimeRecords, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Estimated Cost', value: `$${overtimeMetrics.overtimeCost.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Per Item', value: `${overtimeMetrics.averageOvertimePerItem.toFixed(1)}h`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Overtime Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule Item</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overtimeData.map((item) =>
                  item.overtimeRecords?.map((record, index) => {
                    const po = purchaseOrders.find(po => po.id === item.poId);
                    const product = products.find(p => p.id === item.productId);
                    const multiplier = getOvertimeMultiplier(record.actualOvertimeHours || record.plannedOvertimeHours);
                    const cost = (record.actualOvertimeHours || record.plannedOvertimeHours) * 25 * multiplier;

                    return (
                      <tr key={`${item.id}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{po?.poNumber}</div>
                          <div className="text-xs text-gray-500">{product?.productName} - {item.processStep}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {record.actualOvertimeHours || record.plannedOvertimeHours}h
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {record.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          ${cost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
                {overtimeData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No overtime records found
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

  function formatDMYHM(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 mt-1">Production analytics and performance insights</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => generateReport('pdf')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
          >
            <Download size={18} className="text-[#F24E1E]" />
            Export PDF
          </button>
          <button
            onClick={() => generateReport('excel')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-all shadow-lg shadow-orange-200 font-medium"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white p-1.5 rounded-xl border border-gray-200 w-fit shadow-sm">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'detailed', label: 'Detailed View' },
          { id: 'machine-utilization', label: 'Machine Utilization' },
          { id: 'overtime', label: 'Overtime Analysis' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${reportType === tab.id
                ? 'bg-[#F24E1E] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {reportType === 'summary' && <SummaryReport />}
        {reportType === 'detailed' && <DetailedReport />}
        {reportType === 'machine-utilization' && <MachineUtilizationReport />}
        {reportType === 'overtime' && <OvertimeReport />}
      </div>
    </div>
  );
};

export default Reports;