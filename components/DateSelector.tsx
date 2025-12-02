import React from 'react';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onChange }) => {
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(e.target.value));
    onChange(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(parseInt(e.target.value));
    onChange(newDate);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(parseInt(e.target.value));
    onChange(newDate);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center p-4 bg-gray-800 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-gray-300">วันที่:</span>
        <select 
          value={selectedDate.getDate()} 
          onChange={handleDayChange}
          className="bg-gray-700 text-white p-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-300">เดือน:</span>
        <select 
          value={selectedDate.getMonth()} 
          onChange={handleMonthChange}
          className="bg-gray-700 text-white p-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-300">พ.ศ.:</span>
        <select 
          value={selectedDate.getFullYear()} 
          onChange={handleYearChange}
          className="bg-gray-700 text-white p-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
        </select>
      </div>
    </div>
  );
};

export default DateSelector;
