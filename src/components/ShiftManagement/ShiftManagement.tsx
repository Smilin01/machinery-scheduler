import React, { useState } from 'react';
import { Shift, BreakTime } from '../../types';
import { useApp } from '../../contexts/AppContext';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Coffee,
  Utensils,
  Settings,
  Calendar,
  Users,
  Power,
  PowerOff,
  Check,
  AlertCircle
} from 'lucide-react';

const ShiftManagement: React.FC = () => {
  const { shifts, setShifts } = useApp();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Shift>>({
    shiftName: '',
    timing: {
      startTime: '09:00',
      endTime: '17:00',
      allowFlexibleTiming: false,
      overtimeAllowed: false,
      maxOvertimeHours: 2
    },
    breakTimes: [],
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true,
    color: '#F24E1E'
  });

  const defaultBreakTemplates = [
    { name: 'Morning Break', type: 'short_break' as const, duration: 15, start: '10:30', end: '10:45' },
    { name: 'Lunch Break', type: 'lunch' as const, duration: 60, start: '12:30', end: '13:30' },
    { name: 'Afternoon Break', type: 'tea_break' as const, duration: 15, start: '15:30', end: '15:45' }
  ];

  const addBreak = (template?: typeof defaultBreakTemplates[0]) => {
    const newBreak: BreakTime = {
      id: crypto.randomUUID(),
      name: template?.name || 'New Break',
      start: template?.start || '12:00',
      end: template?.end || '12:30',
      duration: template?.duration || 30,
      type: template?.type || 'custom',
      isPaid: template?.type === 'lunch' ? false : true,
      isFlexible: false,
      description: ''
    };

    setFormData(prev => ({
      ...prev,
      breakTimes: [...(prev.breakTimes || []), newBreak]
    }));
  };

  const updateBreak = (breakId: string, updates: Partial<BreakTime>) => {
    setFormData(prev => ({
      ...prev,
      breakTimes: prev.breakTimes?.map(b =>
        b.id === breakId ? { ...b, ...updates } : b
      ) || []
    }));
  };

  const removeBreak = (breakId: string) => {
    setFormData(prev => ({
      ...prev,
      breakTimes: prev.breakTimes?.filter(b => b.id !== breakId) || []
    }));
  };

  const handleSubmit = () => {
    if (!formData.shiftName || !formData.timing) return;

    const newShift: Shift = {
      id: isEditing || crypto.randomUUID(),
      shiftName: formData.shiftName,
      timing: formData.timing,
      breakTimes: formData.breakTimes || [],
      workingDays: formData.workingDays || [],
      isActive: formData.isActive ?? true,
      color: formData.color || '#F24E1E',
      description: formData.description,
      // Legacy support
      startTime: formData.timing.startTime,
      endTime: formData.timing.endTime
    };

    if (isEditing) {
      setShifts(shifts.map(s => s.id === isEditing ? newShift : s));
    } else {
      setShifts([...shifts, newShift]);
    }

    resetForm();
  };

  const toggleShiftStatus = (shiftId: string) => {
    setShifts(shifts.map(shift =>
      shift.id === shiftId
        ? { ...shift, isActive: !shift.isActive }
        : shift
    ));
  };

  const deleteShift = (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      setShifts(shifts.filter(shift => shift.id !== shiftId));
    }
  };

  const resetForm = () => {
    setFormData({
      shiftName: '',
      timing: {
        startTime: '09:00',
        endTime: '17:00',
        allowFlexibleTiming: false,
        overtimeAllowed: false,
        maxOvertimeHours: 2
      },
      breakTimes: [],
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      isActive: true,
      color: '#F24E1E'
    });
    setIsEditing(null);
    setShowAddForm(false);
  };

  const editShift = (shift: Shift) => {
    setFormData({
      ...shift,
      timing: shift.timing || {
        startTime: shift.startTime || '09:00',
        endTime: shift.endTime || '17:00',
        allowFlexibleTiming: false,
        overtimeAllowed: false,
        maxOvertimeHours: 2
      }
    });
    setIsEditing(shift.id);
    setShowAddForm(true);
  };

  const getBreakIcon = (type: string) => {
    switch (type) {
      case 'lunch': return <Utensils size={16} />;
      case 'tea_break':
      case 'short_break': return <Coffee size={16} />;
      case 'maintenance': return <Settings size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shift Management</h1>
          <p className="text-gray-500 mt-1">Configure work shifts, timing, and break schedules</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>{shifts.filter(s => s.isActive).length} Active Shifts</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
              <span>{shifts.filter(s => !s.isActive).length} Inactive Shifts</span>
            </div>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-all shadow-lg shadow-orange-200 font-medium group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            Add New Shift
          </button>
        )}
      </div>

      {/* Shift Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Shift' : 'Create New Shift'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Set up shift timings and break rules</p>
            </div>
            <button
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Basic Info */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shift Name
                </label>
                <input
                  type="text"
                  value={formData.shiftName}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                  placeholder="e.g., Morning Shift A"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.timing?.startTime}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        timing: { ...prev.timing!, startTime: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.timing?.endTime}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        timing: { ...prev.timing!, endTime: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shift Color Tag
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-12 p-1 border border-gray-200 rounded-xl cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Pick a color to identify this shift in the schedule</span>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="flexibleTiming" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Allow Flexible Timing
                  </label>
                  <input
                    type="checkbox"
                    id="flexibleTiming"
                    checked={formData.timing?.allowFlexibleTiming}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timing: { ...prev.timing!, allowFlexibleTiming: e.target.checked }
                    }))}
                    className="w-5 h-5 text-[#F24E1E] rounded border-gray-300 focus:ring-[#F24E1E]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="overtimeAllowed" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Allow Overtime
                  </label>
                  <input
                    type="checkbox"
                    id="overtimeAllowed"
                    checked={formData.timing?.overtimeAllowed}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timing: { ...prev.timing!, overtimeAllowed: e.target.checked }
                    }))}
                    className="w-5 h-5 text-[#F24E1E] rounded border-gray-300 focus:ring-[#F24E1E]"
                  />
                </div>

                {formData.timing?.overtimeAllowed && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Max Overtime Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={formData.timing.maxOvertimeHours}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        timing: { ...prev.timing!, maxOvertimeHours: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Advanced & Breaks */}
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const isSelected = formData.workingDays?.includes(day as any);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const days = formData.workingDays || [];
                          if (isSelected) {
                            setFormData(prev => ({ ...prev, workingDays: days.filter(d => d !== day) }));
                          } else {
                            setFormData(prev => ({ ...prev, workingDays: [...days, day as any] }));
                          }
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                          ${isSelected
                            ? 'bg-[#F24E1E] text-white shadow-md shadow-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">Break Schedule</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addBreak()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Custom
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {defaultBreakTemplates.map(template => (
                    <button
                      key={template.name}
                      onClick={() => addBreak(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
                    >
                      {getBreakIcon(template.type)}
                      Add {template.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100 min-h-[200px]">
                  {formData.breakTimes?.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400">
                      <Coffee size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">No breaks added yet</p>
                    </div>
                  )}
                  {formData.breakTimes?.map(breakTime => (
                    <div key={breakTime.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm group">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                          {getBreakIcon(breakTime.type)}
                        </div>
                        <input
                          type="text"
                          value={breakTime.name}
                          onChange={(e) => updateBreak(breakTime.id, { name: e.target.value })}
                          className="flex-1 px-2 py-1 border-none focus:ring-0 font-medium text-gray-900 placeholder-gray-400 bg-transparent"
                          placeholder="Break name"
                        />
                      </div>

                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        <input
                          type="time"
                          value={breakTime.start}
                          onChange={(e) => updateBreak(breakTime.id, { start: e.target.value })}
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm w-20 text-center"
                        />
                        <span className="text-gray-400 text-xs">to</span>
                        <input
                          type="time"
                          value={breakTime.end}
                          onChange={(e) => updateBreak(breakTime.id, { end: e.target.value })}
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm w-20 text-center"
                        />
                      </div>

                      <div className="flex items-center gap-3 sm:ml-auto">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={breakTime.isPaid}
                            onChange={(e) => updateBreak(breakTime.id, { isPaid: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          Paid
                        </label>

                        <button
                          onClick={() => removeBreak(breakTime.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={resetForm}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] shadow-lg shadow-orange-200 font-medium transition-all"
            >
              <Save size={18} />
              {isEditing ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </div>
      )}

      {/* Shifts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {shifts.map(shift => (
          <div
            key={shift.id}
            className={`
              group relative bg-white rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden
              ${shift.isActive ? 'border-gray-200' : 'border-gray-200 opacity-75 grayscale-[0.5] hover:grayscale-0'}
            `}
          >
            {/* Color Stripe */}
            <div className="h-2 w-full" style={{ backgroundColor: shift.color }}></div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-xl mb-1">{shift.shiftName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <Clock size={14} className="text-[#F24E1E]" />
                    {shift.timing?.startTime || shift.startTime} - {shift.timing?.endTime || shift.endTime}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => editShift(shift)}
                    className="p-2 text-gray-400 hover:text-[#F24E1E] hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteShift(shift.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => toggleShiftStatus(shift.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                    ${shift.isActive
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  `}
                >
                  {shift.isActive ? (
                    <><Power size={14} /> Active</>
                  ) : (
                    <><PowerOff size={14} /> Inactive</>
                  )}
                </button>

                <div className="flex -space-x-2">
                  {shift.workingDays?.slice(0, 3).map((day, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                      {day.charAt(0)}
                    </div>
                  ))}
                  {(shift.workingDays?.length || 0) > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                      +{(shift.workingDays?.length || 0) - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {shift.breakTimes && shift.breakTimes.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Coffee size={12} /> Break Schedule
                    </p>
                    <div className="space-y-2">
                      {shift.breakTimes.slice(0, 3).map(breakTime => (
                        <div key={breakTime.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium">{breakTime.name}</span>
                          <span className="text-gray-500 text-xs bg-white px-2 py-0.5 rounded border border-gray-200">
                            {breakTime.start} - {breakTime.end}
                          </span>
                        </div>
                      ))}
                      {shift.breakTimes.length > 3 && (
                        <p className="text-xs text-center text-gray-400 pt-1">
                          + {shift.breakTimes.length - 3} more breaks
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {shift.timing?.allowFlexibleTiming && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                      <Clock size={12} /> Flexible
                    </span>
                  )}
                  {shift.timing?.overtimeAllowed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                      <Users size={12} /> OT Allowed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {shifts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Clock size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No shifts configured</h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              Get started by creating your first work shift to manage employee schedules effectively.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] shadow-lg shadow-orange-200 font-medium transition-all"
            >
              <Plus size={20} />
              Create First Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
