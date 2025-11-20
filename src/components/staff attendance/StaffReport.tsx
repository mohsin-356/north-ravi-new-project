import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "../ui/month-year-picker";
import type { UIStaff, AttendanceRecord } from "../../utils/staffService";
import { getMonthlyAttendance, getAttendanceSettings } from "../../utils/staffService";

interface StaffReportProps {
  staffList: UIStaff[];
  attendanceRecords: any[]; // kept for backward-compat but we rely on staff.attendance
  onClose: () => void;
  initialMonth?: string; // YYYY-MM; if provided, used as the initial selected month
  initialStaffId?: string; // if provided, preselect this staff
}

const StaffReport: React.FC<StaffReportProps> = ({ staffList, attendanceRecords, onClose, initialMonth, initialStaffId }) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>(() => initialMonth || new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyRows, setMonthlyRows] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<any>({ lateDeduction: 0, leaveDeduction: 0, earlyOutDeduction: 0 });

  useEffect(() => {
    // prioritize initialStaffId when provided
    if (initialStaffId) {
      setSelectedStaffId(initialStaffId);
      return;
    }
    if (!selectedStaffId && staffList.length > 0) {
      const first = staffList[0]?._id;
      if (first) setSelectedStaffId(first);
    }
  }, [staffList, selectedStaffId, initialStaffId]);

  useEffect(() => {
    getAttendanceSettings().then((s) => {
      if (s && s.value) setSettings(s.value);
    }).catch(() => {});
  }, []);

  const filteredStaff = useMemo(
    () => staffList.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [staffList, search]
  );

  const selected = useMemo(
    () => filteredStaff.find((s) => (s._id || "") === selectedStaffId) || staffList.find(s => (s._id||"")===selectedStaffId),
    [filteredStaff, staffList, selectedStaffId]
  );

  // Fetch monthly attendance for selected staff and month
  useEffect(() => {
    if (!selectedStaffId) return;
    getMonthlyAttendance(selectedStaffId, month)
      .then((rows) => setMonthlyRows(rows))
      .catch(() => setMonthlyRows([]));
  }, [selectedStaffId, month]);

  // Fallback rows if backend empty: use embedded or provided
  const rows = useMemo(() => {
    if (monthlyRows.length) return monthlyRows;
    const embedded = (selected?.attendance || []).filter((a) => String(a.date).startsWith(month));
    if (embedded.length) return embedded as AttendanceRecord[];
    return attendanceRecords.filter((r) => r.staffId === selectedStaffId && String(r.date).startsWith(month));
  }, [monthlyRows, selected, attendanceRecords, selectedStaffId, month]);

  const exportCSV = () => {
    if (!selected) return;
    const header = "Date,Check In,Check Out,Status\n";
    const csvBody = rows
      .map((r: any) => {
        const date = new Date(r.date).toLocaleDateString();
        const cin = r.checkIn || r.checkInTime || "";
        const cout = r.checkOut || r.checkOutTime || "";
        const status = r.status || "";
        return `${date},${cin},${cout},${status}`;
      })
      .join("\n");
    const blob = new Blob([header + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = useMemo(() => {
    const [yy, mm] = month.split("-").map(Number);
    return new Date(yy, mm, 0).getDate();
  }, [month]);

  const stats = useMemo(() => {
    const lower = (s: any) => String(s || "").toLowerCase();
    const present = rows.filter((r: any) => lower(r.status) === "present").length;
    const leave = rows.filter((r: any) => lower(r.status) === "leave").length;
    const late = rows.filter((r: any) => lower(r.status) === "late").length;
    return { present, leave, late };
  }, [rows]);

  const basicSalary = Number(selected?.salary || 0);
  const lateDeduction = (settings?.lateDeduction || 0) * stats.late;
  const leaveDeduction = (settings?.leaveDeduction || 0) * stats.leave;
  const totalDeductions = lateDeduction + leaveDeduction;
  const netSalary = Math.max(0, basicSalary - totalDeductions);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl">
        <DialogHeader>
          <DialogTitle>Staff Report</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:flex-1 flex gap-2">
            <Input
              placeholder={"Search staff by name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="min-w-[10rem]">
              <MonthYearPicker value={month} onChange={setMonth} />
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={"Select staff"} />
              </SelectTrigger>
              <SelectContent>
                {(filteredStaff.length ? filteredStaff : staffList).map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!selected}>Export</Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        {selected ? (
          <div className="space-y-4">
            {/* Selected Staff banner */}
            <div className="rounded-md border bg-blue-50 p-3 text-sm">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-gray-500 capitalize">{selected.position || "-"}</div>
            </div>

            <div className="text-sm font-medium">
              Monthly Report - {new Date(month + "-01").toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>

            {/* Details and Attendance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-2">Staff Details</div>
                <div className="space-y-1">
                  <div><span className="font-medium">Name:</span> {selected.name}</div>
                  <div><span className="font-medium">Position:</span> <span className="capitalize">{selected.position || "-"}</span></div>
                  <div><span className="font-medium">Basic Salary:</span> {(basicSalary).toLocaleString()} PKR</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2">Attendance</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md bg-green-50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                    <div className="text-xs text-gray-600">Present</div>
                  </div>
                  <div className="rounded-md bg-red-50 p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{stats.leave}</div>
                    <div className="text-xs text-gray-600">Leaves</div>
                  </div>
                  <div className="rounded-md bg-yellow-50 p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
                    <div className="text-xs text-gray-600">Late Arrivals</div>
                  </div>
                  <div className="rounded-md bg-blue-50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{daysInMonth}</div>
                    <div className="text-xs text-gray-600">Working Days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Details */}
            <div>
              <div className="font-semibold mb-2">Salary Details</div>
              <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Basic Salary</div>
                  <div className="text-lg font-medium">{basicSalary.toLocaleString()} PKR</div>
                  <div className="mt-3 text-gray-600">Deductions:</div>
                  <div className="text-xs text-gray-500">Late Arrivals ({stats.late}): <span className="text-red-600">-{lateDeduction.toLocaleString()} PKR</span></div>
                  <div className="text-xs text-gray-500">Leaves ({stats.leave}): <span className="text-red-600">-{leaveDeduction.toLocaleString()} PKR</span></div>
                  <div className="mt-1 font-medium">Total Deductions: <span className="text-red-600">-{totalDeductions.toLocaleString()} PKR</span></div>
                </div>
                <div className="md:col-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-600 mb-1">Net Salary</div>
                    <div className="text-3xl font-extrabold text-green-600">{netSalary.toLocaleString()} PKR</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto max-h-[45vh]">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Check In</th>
                    <th className="p-2 border">Check Out</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((rec: any, idx: number) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border">{new Date(rec.date).toLocaleDateString()}</td>
                      <td className="p-2 border">{rec.checkIn || rec.checkInTime || '-'}</td>
                      <td className="p-2 border">{rec.checkOut || rec.checkOutTime || '-'}</td>
                      <td className="p-2 border capitalize">{rec.status || '-'}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-gray-500 border" colSpan={4}>No records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Please select a staff member to view details.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffReport;
