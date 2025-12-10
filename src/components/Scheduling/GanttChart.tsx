import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ScheduleItem } from '../../types';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Clock } from 'lucide-react';

interface GanttChartProps {
  scheduleItems: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ scheduleItems, onItemClick }) => {
  const { machines, products, purchaseOrders } = useApp();
  const { holidays } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [zoomLevel, setZoomLevel] = useState(1);

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const generateTimeSlots = () => {
    const slots = [];
    const current = new Date(rangeStart);
    const slotDuration = viewMode === 'day' ? 60 : viewMode === 'week' ? 60 * 24 : 60 * 24 * 7; // minutes

    while (current <= rangeEnd) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + slotDuration);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  const isHoliday = (date: Date) => holidays.includes(date.toISOString().split('T')[0]);

  // Helper function to parse shift timing
  const parseShiftTiming = (shiftTiming: string) => {
    if (shiftTiming === 'Custom') return { start: '09:00', end: '17:00' };
    const [start, end] = shiftTiming.split('-');
    return { start: start || '09:00', end: end || '17:00' };
  };

  // Helper function to get working hours from shift timing
  const getWorkingHoursFromShift = (shiftTiming: string): number => {
    const { start, end } = parseShiftTiming(shiftTiming);
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);

    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  };

  // Split schedule item into daily segments based on machine shift
  const splitItemByShift = (item: ScheduleItem) => {
    const machine = machines.find(m => m.id === item.machineId);
    if (!machine) return [item];

    const { start: shiftStart, end: shiftEnd } = parseShiftTiming(machine.shiftTiming);
    const workingHoursPerDay = getWorkingHoursFromShift(machine.shiftTiming);
    const workingMinutesPerDay = workingHoursPerDay * 60;

    const itemStart = new Date(item.startDate);
    const itemEnd = new Date(item.endDate);
    const totalDurationMinutes = item.allocatedTime;

    const segments = [];
    let remainingTime = totalDurationMinutes;
    let currentDate = new Date(itemStart);

    while (remainingTime > 0 && currentDate <= itemEnd) {
      // Skip weekends and holidays
      const dateStr = currentDate.toISOString().split('T')[0];
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const isHolidayDate = holidays.includes(dateStr);

      if (isWeekend || isHolidayDate) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Calculate segment for this day
      const segmentDuration = Math.min(remainingTime, workingMinutesPerDay);

      // Create segment start and end times based on shift timing
      const segmentStart = new Date(currentDate);
      const [startHour, startMinute] = shiftStart.split(':').map(Number);
      segmentStart.setHours(startHour, startMinute, 0, 0);

      const segmentEnd = new Date(segmentStart);
      segmentEnd.setMinutes(segmentEnd.getMinutes() + segmentDuration);

      segments.push({
        ...item,
        id: `${item.id}-${segments.length}`,
        startDate: segmentStart.toISOString(),
        endDate: segmentEnd.toISOString(),
        allocatedTime: segmentDuration,
        isSegment: true,
        originalId: item.id,
        segmentIndex: segments.length
      });

      remainingTime -= segmentDuration;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return segments.length > 0 ? segments : [item];
  };

  const getItemPosition = (item: ScheduleItem) => {
    const itemStart = new Date(item.startDate);
    const itemEnd = new Date(item.endDate);
    const totalDuration = rangeEnd.getTime() - rangeStart.getTime();

    const left = ((itemStart.getTime() - rangeStart.getTime()) / totalDuration) * 100;
    const width = ((itemEnd.getTime() - itemStart.getTime()) / totalDuration) * 100;

    return { left: Math.max(0, left), width: Math.max(1, width) };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 border-emerald-600';
      case 'in-progress': return 'bg-blue-500 border-blue-600';
      case 'delayed': return 'bg-red-500 border-red-600';
      case 'paused': return 'bg-amber-500 border-amber-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const hasOvertime = (item: ScheduleItem) => {
    return item.overtimeRecords && item.overtimeRecords.length > 0;
  };

  const getTotalOvertimeHours = (item: ScheduleItem) => {
    if (!item.overtimeRecords) return 0;
    return item.overtimeRecords.reduce((total, record) =>
      total + (record.actualOvertimeHours || record.plannedOvertimeHours), 0
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const formatTimeSlot = (date: Date) => {
    switch (viewMode) {
      case 'day':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Gantt Chart</h3>
            </div>

            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center px-2">
                {viewMode === 'day' && currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                {viewMode === 'week' && `Week of ${rangeStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                {viewMode === 'month' && currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
              {['day', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode
                      ? 'bg-white text-[#F24E1E] shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-medium text-gray-500 min-w-[40px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-gray-900"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart Area */}
      <div className="overflow-x-auto custom-scrollbar" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
        <div className="min-w-[1000px]">
          {/* Time Header */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <div className="w-56 p-3 border-r border-gray-200 font-semibold text-xs text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20">
              Machine / Resource
            </div>
            <div className="flex-1 flex">
              {timeSlots.map((slot: Date, index: number) => {
                const dateStr = slot.toISOString().split('T')[0];
                const holiday = isHoliday(slot);
                return (
                  <div
                    key={index}
                    className={`flex-1 p-2 border-r border-gray-100 text-xs text-center min-w-[80px] font-medium text-gray-500 ${holiday ? 'bg-red-50/50' : ''}`}
                    title={holiday ? 'Holiday' : ''}
                  >
                    {formatTimeSlot(slot)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Machine Rows */}
          {machines.map((machine) => {
            const machineItems = scheduleItems.filter(item => item.machineId === machine.id);

            return (
              <div key={machine.id} className="flex border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <div className="w-56 p-4 border-r border-gray-200 sticky left-0 bg-white z-10 group">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-[#F24E1E] transition-colors">{machine.machineName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{machine.machineType}</p>
                    <div className="flex items-center mt-2">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${machine.status === 'active' ? 'bg-emerald-500' :
                          machine.status === 'maintenance' ? 'bg-amber-500' :
                            machine.status === 'breakdown' ? 'bg-red-500' :
                              'bg-gray-400'
                        }`} />
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{machine.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 relative h-20 bg-white">
                  {/* Time Grid Lines */}
                  {timeSlots.map((_, index) => (
                    <div
                      key={index}
                      className="absolute top-0 bottom-0 border-r border-gray-50"
                      style={{ left: `${(index / timeSlots.length) * 100}%` }}
                    />
                  ))}

                  {/* Schedule Items */}
                  {machineItems.flatMap(item => splitItemByShift(item)).map((item, index) => {
                    const position = getItemPosition(item);
                    const product = products.find(p => p.id === item.productId);
                    const po = purchaseOrders.find(p => p.id === item.poId);

                    let progress = item.progress !== undefined ? item.progress : 0;
                    if (progress === 0) {
                      let start = new Date(item.actualStartTime || item.startDate);
                      let end = new Date(item.actualEndTime || item.endDate);
                      let now = new Date();
                      if (now <= start) progress = 0;
                      else if (now >= end) progress = 100;
                      else progress = Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
                    }

                    const isSegmented = (item as any).isSegment;
                    const segmentIndex = (item as any).segmentIndex;

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className={`absolute top-2 bottom-2 rounded-md cursor-pointer transition-all duration-200 hover:shadow-md hover:z-20 border-l-4 ${getStatusColor(item.status)
                          } ${isSegmented ? 'opacity-90' : ''} ${hasOvertime(item) ? 'ring-2 ring-orange-400 ring-offset-1' : ''
                          }`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          minWidth: '40px'
                        }}
                        onClick={() => onItemClick?.(item)}
                      >
                        <div className="px-2 py-1 text-white text-xs h-full flex flex-col justify-center overflow-hidden">
                          <div className="font-semibold truncate flex items-center gap-1">
                            {product?.productName || 'Unknown'}
                            {isSegmented && <span className="opacity-75 text-[10px]">({segmentIndex + 1})</span>}
                          </div>
                          <div className="text-[10px] opacity-90 truncate">
                            {po?.poNumber} • {item.quantity}pcs
                          </div>
                        </div>

                        {/* Progress Bar Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                          <div
                            className="h-full bg-white/50 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
              <span>Scheduled</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">Indicators:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-orange-400 rounded-sm"></div>
              <span>Overtime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;