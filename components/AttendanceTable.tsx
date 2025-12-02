import React from 'react';
import { ShiftRecord } from '../types';

interface AttendanceTableProps {
  records: ShiftRecord[];
  isLoading: boolean;
  selectedDate: Date;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, isLoading, selectedDate }) => {
  const thaiMonth = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ][selectedDate.getMonth()];
  
  const thaiYear = selectedDate.getFullYear() + 543;

  return (
    <div className="w-full max-w-[210mm] mx-auto p-2 print:p-0 print:w-full">
      <div className="text-center mb-6 space-y-2 print:text-black">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-100 print:text-black">บัญชีลงเวลาการปฏิบัติราชการของข้าราชการ</h1>
        <h2 className="text-lg text-gray-300 print:text-black">
          วันที่ <span className="underline decoration-dotted decoration-gray-500 mx-1">{selectedDate.getDate()}</span> 
          เดือน <span className="underline decoration-dotted decoration-gray-500 mx-1">{thaiMonth}</span> 
          พ.ศ. <span className="underline decoration-dotted decoration-gray-500 mx-1">{thaiYear}</span>
        </h2>
      </div>

      <div className="overflow-x-auto shadow-xl rounded-sm border border-gray-700 print:shadow-none print:border-none print:overflow-visible">
        <table className="min-w-full bg-[#1e1e1e] text-center text-sm md:text-base border-collapse print:bg-white print:text-black print:text-xs">
          <thead>
            <tr className="bg-[#2d2d2d] text-gray-200 print:bg-gray-200 print:text-black">
              {/* Adjusted widths: Reduced Name, Increased Signatures */}
              <th className="py-3 px-1 border border-gray-600 font-medium w-[5%] print:border-black">ลำดับที่</th>
              <th className="py-3 px-1 border border-gray-600 font-medium w-[8%] print:border-black">เวร</th>
              <th className="py-3 px-2 border border-gray-600 font-medium w-[18%] print:border-black">ชื่อ-สกุล</th>
              <th className="py-3 px-1 border border-gray-600 font-medium w-[14%] text-gray-400 print:text-black print:border-black">ลายมือชื่อ</th>
              <th className="py-3 px-1 border border-gray-600 font-medium w-[8%] print:border-black">เวลามา</th>
              <th className="py-3 px-1 border border-gray-600 font-medium w-[14%] text-gray-400 print:text-black print:border-black">ลายมือชื่อ</th>
              <th className="py-3 px-1 border border-gray-600 font-medium w-[8%] print:border-black">เวลากลับ</th>
              <th className="py-3 px-2 border border-gray-600 font-medium w-[25%] print:border-black">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400 animate-pulse print:text-black print:border-black border border-gray-700">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 italic print:text-black print:border-black border border-gray-700">
                  ไม่มีข้อมูลการลงเวลาสำหรับเงื่อนไขที่กำหนดในวันนี้
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.id} className="hover:bg-[#252525] transition-colors text-gray-300 print:text-black print:hover:bg-transparent">
                  <td className="py-3 px-1 border border-gray-700 print:border-black">{index + 1}</td>
                  <td className={`py-3 px-1 border border-gray-700 font-medium print:border-black print:text-black
                    ${record.shift === 'เวรเช้า' ? 'text-yellow-400' : ''}
                    ${record.shift === 'เวรบ่าย' ? 'text-orange-400' : ''}
                    ${record.shift === 'เวรดึก' ? 'text-blue-400' : ''}
                  `}>
                    {record.shift}
                  </td>
                  <td className="py-3 px-2 border border-gray-700 text-left pl-2 print:border-black whitespace-nowrap overflow-hidden text-ellipsis">{record.name}</td>
                  <td className="py-3 px-1 border border-gray-700 print:border-black"></td> {/* Sign In Placeholder */}
                  <td className="py-3 px-1 border border-gray-700 print:border-black">{record.inTime || "-"}</td>
                  <td className="py-3 px-1 border border-gray-700 print:border-black"></td> {/* Sign Out Placeholder */}
                  <td className="py-3 px-1 border border-gray-700 print:border-black">{record.outTime || "-"}</td>
                  <td className="py-3 px-1 border border-gray-700 text-xs text-gray-500 print:text-black print:border-black">{record.remarks}</td>
                </tr>
              ))
            )}
            
            {/* Fill empty rows for aesthetics */}
            {!isLoading && records.length > 0 && Array.from({ length: Math.max(0, 5 - records.length) }).map((_, i) => (
               <tr key={`empty-${i}`} className="text-gray-600 print:text-black">
                 <td className="py-4 border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
                 <td className="border border-gray-700 print:border-black">&nbsp;</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;