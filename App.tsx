import React, { useState, useEffect, useCallback } from 'react';
import { fetchSheetData } from './services/googleSheetService';
import { processShifts, getMonthlyShiftData, MonthlyShiftData } from './utils/shiftProcessor';
import { RawLog, ShiftRecord } from './types';
import DateSelector from './components/DateSelector';
import AttendanceTable from './components/AttendanceTable';
import MonthlySummary from './components/MonthlySummary';

const App: React.FC = () => {
  const [allLogs, setAllLogs] = useState<RawLog[]>([]);
  
  // Daily View State
  const [displayedRecords, setDisplayedRecords] = useState<ShiftRecord[]>([]);
  
  // Monthly View State
  const [monthlyData, setMonthlyData] = useState<MonthlyShiftData[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<number>(0);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateSheetError, setIsPrivateSheetError] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // View Control
  const [currentView, setCurrentView] = useState<'daily' | 'monthly'>('daily');
  
  // State to track if user is interacting with the table (hovering)
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const initData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsPrivateSheetError(false);
    try {
      const data = await fetchSheetData();
      setAllLogs(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      if (err.message === "PRIVATE_SHEET") {
         setError("ไม่สามารถเข้าถึงข้อมูลได้เนื่องจาก Google Sheet ถูกตั้งค่าเป็นส่วนตัว");
         setIsPrivateSheetError(true);
      } else {
         setError("ไม่สามารถดึงข้อมูลได้ (Connection Failed). กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    initData();
  }, [initData]);

  // Auto-refresh logic with Pause capability
  useEffect(() => {
    if (isPaused) return; // Do not set interval if paused

    const interval = setInterval(() => {
      initData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [initData, isPaused]); 

  // Process data when Date or Logs change
  useEffect(() => {
    if (allLogs.length > 0) {
      // Process Daily
      const records = processShifts(allLogs, selectedDate);
      setDisplayedRecords(records);

      // Process Monthly
      const mData = getMonthlyShiftData(allLogs, selectedDate.getFullYear(), selectedDate.getMonth());
      setMonthlyData(mData);
    } else {
      setDisplayedRecords([]);
      setMonthlyData([]);
    }
  }, [selectedDate, allLogs]);

  const handleDateChange = useCallback((newDate: Date) => {
    setSelectedDate(newDate);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col items-center py-8 px-2 md:px-6 print:bg-white print:p-0 print:block">
      
      {/* Header - Hidden on Print */}
      <header className="mb-8 flex flex-col items-center print:hidden">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full mb-4 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">ระบบตรวจสอบเวลาปฏิบัติงาน</h1>
        <p className="text-gray-400 text-sm">ข้อมูลจาก Google Sheets (อัปเดตอัตโนมัติ)</p>
      </header>

      {/* Date Selector - Hidden on Print */}
      <div className="w-full max-w-6xl mb-4 print:hidden space-y-4">
        <DateSelector selectedDate={selectedDate} onChange={handleDateChange} />
        
        {/* View Toggle & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="flex space-x-2">
                <button 
                    onClick={() => setCurrentView('daily')}
                    className={`px-4 py-2 rounded font-medium transition-colors ${currentView === 'daily' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    สรุปรายวัน
                </button>
                <button 
                    onClick={() => setCurrentView('monthly')}
                    className={`px-4 py-2 rounded font-medium transition-colors ${currentView === 'monthly' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    สรุปรายเดือน
                </button>
            </div>

            {currentView === 'monthly' && (
                <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm">วันหยุดราชการรวม:</span>
                    <input 
                        type="number" 
                        min="0"
                        value={publicHolidays}
                        onChange={(e) => setPublicHolidays(parseInt(e.target.value) || 0)}
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                </div>
            )}

            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded shadow transition-colors ml-auto"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                พิมพ์เอกสาร
            </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-6 rounded-lg mb-6 max-w-2xl text-center shadow-xl print:hidden">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">เกิดข้อผิดพลาดในการดึงข้อมูล</h3>
          <p className="mb-4">{error}</p>
          
          {isPrivateSheetError && (
            <div className="bg-black/30 p-4 rounded text-left text-sm space-y-2 mb-4">
              <p className="font-semibold text-yellow-400">คำแนะนำในการแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>ไปที่ Google Sheet ของคุณ</li>
                <li>คลิกปุ่ม <strong>Share (แชร์)</strong> ที่มุมขวาบน</li>
                <li>เปลี่ยนการตั้งค่า General Access (การเข้าถึงทั่วไป) เป็น <strong>Anyone with the link (ทุกคนที่มีลิงก์)</strong></li>
                <li>ตั้งค่าสิทธิ์เป็น <strong>Viewer (ผู้มีสิทธิ์อ่าน)</strong></li>
                <li>คลิก Done (เสร็จสิ้น) แล้วกดปุ่ม "ลองใหม่" ด้านล่าง</li>
              </ol>
            </div>
          )}

          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded font-medium transition-colors shadow-lg"
          >
            ลองใหม่ (Refresh)
          </button>
        </div>
      ) : (
        /* Wrap table with mouse events to pause auto-refresh */
        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="w-full flex justify-center"
        >
          {currentView === 'daily' ? (
            <AttendanceTable 
                records={displayedRecords} 
                isLoading={isLoading} 
                selectedDate={selectedDate} 
            />
          ) : (
            <MonthlySummary 
                data={monthlyData}
                selectedDate={selectedDate}
                publicHolidays={publicHolidays}
            />
          )}
        </div>
      )}

      {/* Footer - Hidden on Print */}
      <footer className="mt-12 text-gray-600 text-xs text-center print:hidden flex flex-col gap-1">
        <p>สร้างโดย SUNNYFMMAX • ข้อมูลล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}</p>
        <p className={`transition-opacity duration-300 ${isPaused ? 'opacity-100 text-yellow-600' : 'opacity-0'}`}>
          (กำลังหยุดอัปเดตชั่วคราวขณะใช้งาน)
        </p>
      </footer>
    </div>
  );
};

export default App;