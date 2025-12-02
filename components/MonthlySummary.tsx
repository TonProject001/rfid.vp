import React, { useState } from 'react';
import { MonthlyShiftData } from '../utils/shiftProcessor';

interface MonthlySummaryProps {
  data: MonthlyShiftData[];
  selectedDate: Date;
  publicHolidays: number;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ data, selectedDate, publicHolidays }) => {
  // State for overrides: Key="Name_Day", Value="STATUS"
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const thaiMonth = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ][selectedDate.getMonth()];
  const thaiYear = selectedDate.getFullYear() + 543;

  const handleStatusChange = (name: string, day: number, status: string) => {
    const key = `${name}_${day}`;
    if (status === '0') {
        // Remove override if setting back to default 0
        const newOverrides = { ...overrides };
        delete newOverrides[key];
        setOverrides(newOverrides);
    } else {
        setOverrides(prev => ({ ...prev, [key]: status }));
    }
  };

  // Helper to determine display string for a day
  const getDayContent = (shifts: string[]): string => {
    if (shifts.includes('ด') && shifts.includes('บ')) return 'ดบ';
    if (shifts.includes('ช') && shifts.includes('บ')) return 'ชบ';
    if (shifts.includes('ช')) return 'ช';
    if (shifts.includes('บ')) return 'บ';
    if (shifts.includes('ด')) return 'ด';
    return ''; // Empty implies "0" (handled in render)
  };

  // Helper to check if a day is a weekend
  const isWeekend = (day: number) => {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0=Sun, 6=Sat
  };

  return (
    <div className="w-full overflow-x-auto print:overflow-visible p-4 print:p-0">
      {/* Print Landscape Hint */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="text-center mb-6 text-white print:text-black">
        <h2 className="text-2xl font-bold">ตารางสรุปการปฏิบัติงานประจำเดือน {thaiMonth} {thaiYear}</h2>
      </div>

      <table className="w-full min-w-[1000px] border-collapse bg-[#1e1e1e] text-center text-sm print:bg-white print:text-black print:text-xs border border-gray-600 print:border-black">
        <thead>
          {/* Header Row 1 */}
          <tr className="bg-[#2d2d2d] text-white print:bg-[#f0f0f0] print:text-black">
            <th rowSpan={2} className="border border-gray-500 px-2 py-1 w-[50px] print:border-black">ลำดับที่</th>
            <th rowSpan={2} className="border border-gray-500 px-2 py-1 w-[180px] print:border-black">ชื่อ-สกุล</th>
            <th colSpan={daysInMonth} className="border border-gray-500 px-2 py-1 print:border-black">วันที่ ที่ขึ้นปฏิบัติงาน</th>
            <th colSpan={2} className="border border-gray-500 px-2 py-1 w-[100px] print:border-black">จำนวนเวร</th>
          </tr>
          {/* Header Row 2 */}
          <tr className="bg-[#2d2d2d] text-white print:bg-[#f0f0f0] print:text-black">
            {daysArray.map(day => (
              <th 
                key={day} 
                className={`border border-gray-500 px-1 py-1 w-[28px] text-xs print:border-black ${isWeekend(day) ? 'text-red-400 print:text-red-600 font-bold' : ''}`}
              >
                {day}
              </th>
            ))}
            <th className="border border-gray-500 px-1 py-1 w-[50px] print:border-black">ดบ</th>
            <th className="border border-gray-500 px-1 py-1 w-[50px] bg-red-900/30 print:bg-red-50 print:text-red-900 font-bold print:border-black">OT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, idx) => {
            let countNightAfternoon = 0; // ดบ
            let countMorningAfternoon = 0; // ชบ
            let countZeros = 0;

            const rowCells = [];
            
            for (let d = 1; d <= daysInMonth; d++) {
                const key = `${user.name}_${d}`;
                const override = overrides[key];
                const shiftContent = getDayContent(user.shiftsByDay[d] || []);
                
                let displayVal = shiftContent;
                let isZero = false;

                if (override) {
                    displayVal = override;
                } else if (!shiftContent) {
                    displayVal = '0';
                    isZero = true;
                    countZeros++;
                }

                // Count for OT / Stats (Based on real shifts, unless overridden? usually overrides like Sick implies no shift count)
                if (!override) {
                    if (shiftContent === 'ดบ') countNightAfternoon++;
                    else if (shiftContent === 'ชบ') countMorningAfternoon++;
                }

                rowCells.push({
                    day: d,
                    displayVal,
                    isZero,
                    override
                });
            }

            // OT Formula: (PublicHolidays - Zeros) + DB + CB
            const otScore = (publicHolidays - countZeros) + countNightAfternoon + countMorningAfternoon;

            return (
              <tr key={user.name} className="hover:bg-[#252525] print:hover:bg-transparent text-gray-300 print:text-black h-[32px]">
                <td className="border border-gray-600 print:border-black">{idx + 1}</td>
                <td className="border border-gray-600 px-2 text-left whitespace-nowrap print:border-black">{user.name}</td>
                
                {/* Render Day Cells */}
                {(() => {
                    const cells = [];
                    for (let i = 0; i < rowCells.length; i++) {
                        const cell = rowCells[i];
                        
                        if (cell.override) {
                            let span = 1;
                            while (i + span < rowCells.length && rowCells[i+span].override === cell.override) {
                                span++;
                            }
                            cells.push(
                                <td 
                                    key={cell.day} 
                                    colSpan={span}
                                    className="border border-gray-600 text-center bg-gray-700 text-white print:bg-gray-200 print:text-black print:border-black p-0 relative"
                                >
                                     <select 
                                        className="w-full h-full bg-transparent text-center appearance-none focus:outline-none cursor-pointer text-[10px] md:text-xs font-bold"
                                        value={cell.override}
                                        onChange={(e) => handleStatusChange(user.name, cell.day, e.target.value)}
                                    >
                                        <option value="ลาป่วย">ลาป่วย</option>
                                        <option value="ประชุม">ประชุม</option>
                                        <option value="VAC">VAC</option>
                                        <option value="0">0</option>
                                    </select>
                                </td>
                            );
                            i += span - 1; 
                        } else {
                            cells.push(
                                <td 
                                    key={cell.day} 
                                    className={`border border-gray-600 text-center p-0 print:border-black relative
                                        ${cell.isZero ? 'text-red-500 font-bold' : ''}
                                        ${cell.displayVal === 'ดบ' || cell.displayVal === 'ชบ' ? 'text-yellow-400 print:text-black font-bold bg-yellow-900/10 print:bg-yellow-100' : ''}
                                    `}
                                >
                                    <div className="w-full h-full flex items-center justify-center text-[11px] md:text-sm">
                                        {cell.displayVal}
                                    </div>
                                    {cell.isZero && (
                                        <select 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            value="0"
                                            onChange={(e) => handleStatusChange(user.name, cell.day, e.target.value)}
                                        >
                                            <option value="0">0</option>
                                            <option value="ลาป่วย">ลาป่วย</option>
                                            <option value="ประชุม">ประชุม</option>
                                            <option value="VAC">VAC</option>
                                        </select>
                                    )}
                                </td>
                            );
                        }
                    }
                    return cells;
                })()}

                {/* Summary Columns */}
                <td className="border border-gray-600 font-medium print:border-black text-yellow-500 print:text-black">{countNightAfternoon || '-'}</td>
                <td className="border border-gray-600 font-bold bg-red-900/20 text-red-200 print:text-black print:bg-red-50 print:border-black">{otScore}</td>
              </tr>
            );
          })}
          
          {/* Empty rows filler if needed */}
          {data.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + 4} className="py-8 text-gray-500 border border-gray-600 print:border-black">ไม่พบข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MonthlySummary;