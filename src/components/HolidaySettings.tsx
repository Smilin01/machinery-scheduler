import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  RefreshCw,
  Star,
  Upload,
  Download,
  Edit2,
  Check,
  X,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal
} from 'lucide-react';

interface HolidayEntry {
  date: string;
  reason: string;
}

const HolidaySettings: React.FC = () => {
  const { holidays, setHolidays } = useApp();

  // Parse holidays
  const parseHoliday = (h: string): HolidayEntry => {
    const [date, ...reasonParts] = h.split('|');
    return { date, reason: reasonParts.join('|') || '' };
  };
  const serializeHoliday = (h: HolidayEntry) => h.reason ? `${h.date}|${h.reason}` : h.date;
  const holidayEntries: HolidayEntry[] = holidays.map(parseHoliday);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-CA');
  };

  const isSunday = (date: Date): boolean => date.getDay() === 0;
  const isSaturday = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    return d.getDay() === 6;
  };

  const [newHoliday, setNewHoliday] = useState('');
  const [newReason, setNewReason] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [year] = useState(new Date().getFullYear());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [calendarClickDate, setCalendarClickDate] = useState<string | null>(null);
  const [calendarClickReason, setCalendarClickReason] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<{ date: string, reason: string } | null>(null);

  // Overtime policy settings
  const [overtimePolicySettings, setOvertimePolicySettings] = useState({
    holidayOvertimeMultiplier: 2.5,
    allowHolidayWork: false,
    maxHolidayOvertimeHours: 8,
    requireApprovalForHolidayWork: true,
    emergencyOverrideAllowed: true
  });

  const [showOvertimePolicyModal, setShowOvertimePolicyModal] = useState(false);

  const getAllSundays = (year: number): string[] => {
    const sundays: string[] = [];
    const date = new Date(year, 0, 1);
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }
    while (date.getFullYear() === year) {
      const dateStr = formatDate(date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayName === 'Sunday') {
        sundays.push(dateStr);
      }
      date.setDate(date.getDate() + 7);
    }
    return sundays;
  };

  const sundays = getAllSundays(year);
  const userHolidays = holidayEntries.filter(
    h => !sundays.includes(h.date) && !isSaturday(h.date)
  );
  const allHolidays = [
    ...sundays.map(date => ({ date, reason: 'Sunday' })),
    ...userHolidays.filter(h => h.reason || h.date)
  ].sort((a, b) => a.date.localeCompare(b.date));

  const addHoliday = () => {
    if (!newHoliday) return;
    let newList = [...holidays, serializeHoliday({ date: newHoliday, reason: newReason })];
    if (recurring) {
      const base = new Date(newHoliday);
      for (let i = 1; i <= 5; i++) {
        const next = new Date(base);
        next.setFullYear(base.getFullYear() + i);
        newList.push(serializeHoliday({ date: formatDate(next), reason: newReason }));
      }
    }
    setHolidays(Array.from(new Set(newList)));
    setNewHoliday('');
    setNewReason('');
    setMessage({ type: 'success', text: 'Holiday added successfully.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const removeHoliday = (date: string) => {
    if (sundays.includes(date)) return;
    setHolidays(holidays.filter(h => !h.startsWith(date)));
  };

  const resetToSundays = () => {
    setHolidays(sundays);
    setMessage({ type: 'success', text: 'Reset to Sundays only.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(holidays, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holidays-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Exported holidays as JSON.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const exportCSV = () => {
    const csv = holidays.map(h => h.replace('|', ',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holidays-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Exported holidays as CSV.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const importHolidays = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let imported: string[] = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(event.target?.result as string);
        } else if (file.name.endsWith('.csv')) {
          imported = (event.target?.result as string).split(/\r?\n/).filter(Boolean).map(line => line.replace(',', '|'));
        }
        if (!Array.isArray(imported) || !imported.every(d => /^\d{4}-\d{2}-\d{2}(\|.*)?$/.test(d))) {
          throw new Error('Invalid format');
        }
        setHolidays(Array.from(new Set([...holidays, ...imported])));
        setMessage({ type: 'success', text: 'Imported holidays successfully.' });
        setTimeout(() => setMessage(null), 3000);
      } catch {
        setMessage({ type: 'error', text: 'Failed to import holidays. Invalid file format.' });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
  const isHoliday = (date: Date) => allHolidays.some(h => h.date === formatDate(date));
  const getHolidayReason = (date: Date) => {
    const entry = allHolidays.find(h => h.date === formatDate(date));
    return entry?.reason || '';
  };
  const isToday = (date: Date) => {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const nextMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const prevMonth = () => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const handleCalendarClick = (date: Date) => {
    const dateStr = formatDate(date);
    const holiday = allHolidays.find(h => h.date === dateStr);
    const isSundayDate = isSunday(date);
    if (holiday && !isSundayDate) {
      setShowRemoveModal({ date: dateStr, reason: holiday.reason });
    } else if (!holiday) {
      setCalendarClickDate(dateStr);
      setCalendarClickReason('');
      setShowAddModal(true);
    }
  };

  const startEdit = (date: string, reason: string) => {
    setEditing(date);
    setEditReason(reason);
  };
  const saveEdit = (date: string) => {
    setHolidays(holidays.map(h => h.startsWith(date) ? serializeHoliday({ date, reason: editReason }) : h));
    setEditing(null);
    setEditReason('');
    setMessage({ type: 'success', text: 'Reason updated.' });
    setTimeout(() => setMessage(null), 3000);
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditReason('');
  };

  const reasonColor = (reason: string) => {
    if (!reason || reason === 'Sunday') return 'bg-gray-100 border-gray-200 text-gray-700';
    if (/festival|holiday|celebration/i.test(reason)) return 'bg-pink-50 border-pink-200 text-pink-700';
    if (/maintenance|shutdown|repair/i.test(reason)) return 'bg-amber-50 border-amber-200 text-amber-700';
    if (/national|public/i.test(reason)) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    return 'bg-purple-50 border-purple-200 text-purple-700';
  };

  const colorLegend = [
    { label: 'Sunday', className: 'bg-gray-100 border-gray-200 text-gray-700', tooltip: 'Default weekly holiday' },
    { label: 'Festival', className: 'bg-pink-50 border-pink-200 text-pink-700', tooltip: 'Festival/Celebration' },
    { label: 'Maintenance', className: 'bg-amber-50 border-amber-200 text-amber-700', tooltip: 'Maintenance/Shutdown' },
    { label: 'Public', className: 'bg-emerald-50 border-emerald-200 text-emerald-700', tooltip: 'National/Public Holiday' },
    { label: 'Other', className: 'bg-purple-50 border-purple-200 text-purple-700', tooltip: 'Other' },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Holiday Settings</h1>
          <p className="text-gray-500 mt-1">Manage company holidays and overtime policies</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowOvertimePolicyModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-medium"
          >
            <Clock size={18} className="text-[#F24E1E]" />
            Overtime Policy
          </button>

          <div className="h-10 w-px bg-gray-300 mx-1 hidden md:block"></div>

          <button onClick={resetToSundays} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-[#F24E1E] transition-all shadow-sm" title="Reset to Sundays">
            <RefreshCw size={20} />
          </button>

          <button onClick={exportJSON} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-[#F24E1E] transition-all shadow-sm" title="Export JSON">
            <Download size={20} />
          </button>

          <label className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-[#F24E1E] transition-all shadow-sm cursor-pointer" title="Import">
            <Upload size={20} />
            <input type="file" accept=".json,.csv" onChange={importHolidays} className="hidden" />
          </label>

          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-all shadow-lg shadow-orange-200 font-medium">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Calendar */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <CalendarIcon className="text-[#F24E1E]" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Calendar Overview</h2>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                  <ChevronLeft size={20} />
                </button>
                <span className="px-4 font-semibold text-gray-700 min-w-[140px] text-center">
                  {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
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
                const isSundayDate = isSunday(date);
                const colorClass = holiday && inMonth ? reasonColor(reason || (isSundayDate ? 'Sunday' : '')) : 'hover:bg-gray-50';

                return (
                  <div
                    key={idx}
                    onClick={() => inMonth && handleCalendarClick(date)}
                    className={`
                      relative h-28 p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer group
                      ${!inMonth ? 'bg-gray-50/50 border-transparent text-gray-300' : 'bg-white border-gray-100'}
                      ${today && inMonth ? 'ring-2 ring-[#F24E1E] ring-offset-2 z-10' : ''}
                      ${holiday && inMonth ? colorClass : ''}
                      ${inMonth && !holiday ? 'hover:border-[#F24E1E]/30' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium ${today && inMonth ? 'text-[#F24E1E]' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </span>
                      {holiday && inMonth && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#F24E1E]/60"></div>
                      )}
                    </div>

                    {holiday && inMonth && (
                      <span className="text-xs font-medium truncate w-full block opacity-85 leading-tight">
                        {reason}
                      </span>
                    )}

                    {today && inMonth && !holiday && (
                      <span className="text-[10px] font-bold text-[#F24E1E]">Today</span>
                    )}

                    {inMonth && !holiday && (
                      <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded-xl transition-opacity">
                        <Plus size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Add & List */}
        <div className="xl:col-span-4 space-y-6">
          {/* Add Holiday Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-[#F24E1E]" /> Add Holiday
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={newHoliday}
                  onChange={e => setNewHoliday(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                  min={`${year}-01-01`}
                  max={`${year + 5}-12-31`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                  placeholder="e.g. Festival, Maintenance"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={e => setRecurring(e.target.checked)}
                    className="w-4 h-4 text-[#F24E1E] rounded border-gray-300 focus:ring-[#F24E1E]"
                  />
                  Recurring (5 years)
                </label>
                <button
                  onClick={addHoliday}
                  disabled={!newHoliday}
                  className="px-6 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-all shadow-md shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Holidays List Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Star size={20} className="text-amber-400" /> Holidays List
              </h3>
              <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 rounded-full text-gray-600">
                {allHolidays.length} Days
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allHolidays.map(({ date, reason }) => {
                    const d = new Date(date);
                    const isSundayDate = isSunday(d);
                    const isEditing = editing === date;

                    if (isSundayDate) return null; // Skip Sundays in list to reduce clutter, or keep if preferred. Keeping for now but maybe filtering could be an option.
                    // Actually let's keep them but style them subtly, or maybe filter them out if the list is too long. 
                    // The original code showed them. Let's filter them out to make the list more useful for "Custom Holidays".

                    return (
                      <tr key={date} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          <div className="text-xs text-gray-500">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editReason}
                              onChange={e => setEditReason(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-[#F24E1E] focus:ring-1 focus:ring-[#F24E1E] outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${reasonColor(reason)}`}>
                              {reason}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(date)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <Check size={16} />
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(date, reason)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => removeHoliday(date)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {allHolidays.filter(h => !isSunday(new Date(h.date))).length === 0 && (
                    <tr><td colSpan={3} className="text-center text-gray-400 py-8">No custom holidays added.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Holiday Modal (from Calendar Click) */}
      {showAddModal && calendarClickDate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <div className="p-2 bg-orange-50 rounded-lg"><Plus size={20} className="text-[#F24E1E]" /></div>
              Add Holiday
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium">
                  {new Date(calendarClickDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <input
                  type="text"
                  value={calendarClickReason}
                  onChange={e => setCalendarClickReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                  placeholder="e.g. Festival, Maintenance"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setCalendarClickDate(null);
                  setCalendarClickReason('');
                }}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHolidays(Array.from(new Set([...holidays, calendarClickDate + (calendarClickReason ? '|' + calendarClickReason : '')])));
                  setShowAddModal(false);
                  setCalendarClickDate(null);
                  setCalendarClickReason('');
                  setMessage({ type: 'success', text: 'Holiday added successfully.' });
                  setTimeout(() => setMessage(null), 3000);
                }}
                className="px-5 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] shadow-lg shadow-orange-200 font-medium transition-colors"
                disabled={!calendarClickDate}
              >
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Holiday Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Remove Holiday?</h3>
              <p className="text-gray-500 mt-2">
                Are you sure you want to remove the holiday on <span className="font-semibold text-gray-900">{new Date(showRemoveModal.date).toLocaleDateString()}</span>?
              </p>
              {showRemoveModal.reason && (
                <span className="mt-3 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 font-medium">
                  {showRemoveModal.reason}
                </span>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowRemoveModal(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors min-w-[100px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHolidays(holidays.filter(h => !h.startsWith(showRemoveModal.date)));
                  setShowRemoveModal(null);
                  setMessage({ type: 'success', text: 'Holiday removed successfully.' });
                  setTimeout(() => setMessage(null), 3000);
                }}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 font-medium transition-colors min-w-[100px]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Policy Modal */}
      {showOvertimePolicyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full mx-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Clock size={24} className="text-[#F24E1E]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Holiday Overtime Policy</h3>
                <p className="text-gray-500 text-sm">Configure rules for working on holidays</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Holiday Work Permission */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 transition-all hover:border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-semibold text-gray-900">Allow Work on Holidays</label>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overtimePolicySettings.allowHolidayWork}
                      onChange={(e) => setOvertimePolicySettings(prev => ({
                        ...prev,
                        allowHolidayWork: e.target.checked
                      }))}
                      className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
                    />
                    <div className={`block w-12 h-7 rounded-full transition-colors ${overtimePolicySettings.allowHolidayWork ? 'bg-[#F24E1E]' : 'bg-gray-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${overtimePolicySettings.allowHolidayWork ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  When enabled, employees can be scheduled to work on holidays with special overtime rates.
                </p>
              </div>

              {overtimePolicySettings.allowHolidayWork && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Holiday Overtime Multiplier */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overtime Multiplier
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={overtimePolicySettings.holidayOvertimeMultiplier}
                          onChange={(e) => setOvertimePolicySettings(prev => ({
                            ...prev,
                            holidayOvertimeMultiplier: parseFloat(e.target.value)
                          }))}
                          className="w-full pl-4 pr-12 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">× Rate</span>
                      </div>
                    </div>

                    {/* Maximum Holiday Overtime Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Hours / Holiday
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={overtimePolicySettings.maxHolidayOvertimeHours}
                          onChange={(e) => setOvertimePolicySettings(prev => ({
                            ...prev,
                            maxHolidayOvertimeHours: parseInt(e.target.value)
                          }))}
                          className="w-full pl-4 pr-16 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Requirements */}
                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-900">Require Approval</label>
                      <input
                        type="checkbox"
                        checked={overtimePolicySettings.requireApprovalForHolidayWork}
                        onChange={(e) => setOvertimePolicySettings(prev => ({
                          ...prev,
                          requireApprovalForHolidayWork: e.target.checked
                        }))}
                        className="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      All holiday work requires management approval before scheduling.
                    </p>
                  </div>

                  {/* Emergency Override */}
                  <div className="p-4 rounded-xl border border-red-100 bg-red-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        <label className="text-sm font-semibold text-gray-900">Emergency Override</label>
                      </div>
                      <input
                        type="checkbox"
                        checked={overtimePolicySettings.emergencyOverrideAllowed}
                        onChange={(e) => setOvertimePolicySettings(prev => ({
                          ...prev,
                          emergencyOverrideAllowed: e.target.checked
                        }))}
                        className="w-5 h-5 text-red-500 rounded border-gray-300 focus:ring-red-500"
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      Allows supervisors to override restrictions in emergencies.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowOvertimePolicyModal(false)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowOvertimePolicyModal(false);
                  setMessage({ type: 'success', text: 'Overtime policy settings updated.' });
                  setTimeout(() => setMessage(null), 3000);
                }}
                className="px-6 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] shadow-lg shadow-orange-200 font-medium transition-colors"
              >
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaySettings;