import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export function MaterialDatePickerDialog({ isOpen, onClose, value, onChange }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setCurrentMonth(d);
    }
  }, [value, isOpen]);

  const year = selectedDate.getFullYear();
  const dayName = selectedDate.toLocaleDateString("en-US", { weekday: "short" });
  const monthNameShort = selectedDate.toLocaleDateString("en-US", { month: "short" });
  const dayNumber = String(selectedDate.getDate()).padStart(2, "0");

  const displayDateStr = `${dayName}, ${monthNameShort} ${dayNumber}`;

  // Calendar logic
  const yearMonthStr = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const daysGrid = getDaysInMonth(currentMonth);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDate(day);
  };

  const handleOk = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-[480px] border-none rounded-lg shadow-2xl flex flex-row min-h-[380px]">
        {/* Left Sidebar using Sunset Orange brand color and larger min-height */}
        <div className="w-[140px] bg-[#FF5733] text-white p-5 flex flex-col justify-start select-none min-h-[380px]">
          <div className="text-xs opacity-75 font-medium tracking-wider">{year}</div>
          <div className="text-2xl font-bold leading-tight mt-2">{displayDateStr}</div>
        </div>

        {/* Right Calendar Area - Added pt-10 to push Month/Chevrons below the cross button */}
        <div className="flex-1 bg-white p-4 pt-10 flex flex-col justify-between min-h-[380px]">
          <div>
            {/* Header with clean chevron navigation and wider gap */}
            <div className="flex justify-between items-center px-2 py-1 select-none">
              <span className="font-semibold text-slate-800 text-sm">{yearMonthStr}</span>
              <div className="flex gap-8 items-center mr-6">
                <button 
                  type="button" 
                  onClick={handlePrevMonth} 
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  onClick={handleNextMonth} 
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mt-2 select-none">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center mt-2 text-xs font-medium">
              {daysGrid.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="w-8 h-8" />;
                
                const isSelected = 
                  day.getDate() === selectedDate.getDate() &&
                  day.getMonth() === selectedDate.getMonth() &&
                  day.getFullYear() === selectedDate.getFullYear();
                  
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDaySelect(day)}
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full transition-all ${
                      isSelected 
                        ? "bg-[#FF5733] text-white font-bold" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 mt-4 text-xs font-bold select-none">
            <button 
              type="button" 
              onClick={onClose} 
              className="text-[#FF5733] hover:bg-slate-50 px-3 py-2 rounded"
            >
              CANCEL
            </button>
            <button 
              type="button" 
              onClick={handleOk} 
              className="text-[#FF5733] hover:bg-slate-50 px-3 py-2 rounded"
            >
              OK
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface TimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // HH:mm
  onChange: (value: string) => void;
}

export function MaterialTimePickerDialog({ isOpen, onClose, value, onChange }: TimePickerProps) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [amPm, setAmPm] = useState("AM");
  const [pickingMode, setPickingMode] = useState<"hours" | "minutes">("hours");

  useEffect(() => {
    if (value) {
      const parts = value.split(":");
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      
      if (h >= 12) {
        setAmPm("PM");
        if (h > 12) h -= 12;
      } else {
        setAmPm("AM");
        if (h === 0) h = 12;
      }
      setHour(h);
      setMinute(m);
    }
  }, [value, isOpen]);

  const handleToggleAmPm = (mode: string) => {
    setAmPm(mode);
  };

  const handleSelectNumber = (num: number) => {
    if (pickingMode === "hours") {
      setHour(num);
      setPickingMode("minutes");
    } else {
      setMinute(num);
    }
  };

  const handleOk = () => {
    let finalHour = hour;
    if (amPm === "PM" && hour < 12) finalHour += 12;
    if (amPm === "AM" && hour === 12) finalHour = 0;
    
    const hStr = String(finalHour).padStart(2, "0");
    const mStr = String(minute).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    onClose();
  };

  // Clock positioning helper
  const renderClockNumbers = () => {
    const items = pickingMode === "hours" 
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] 
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      
    const radius = 68; // px
    
    return items.map((num, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      const isSelected = pickingMode === "hours" ? hour === num : minute === num;
      
      return (
        <button
          key={`clock-${num}-${i}`}
          type="button"
          onClick={() => handleSelectNumber(num)}
          style={{
            transform: `translate(${x}px, ${y}px)`,
          }}
          className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold select-none ${
            isSelected 
              ? "bg-[#FF5733] text-white" 
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {pickingMode === "minutes" && num === 0 ? "00" : num}
        </button>
      );
    });
  };

  // Calculation for hand line
  const getHandRotation = () => {
    const val = pickingMode === "hours" ? hour % 12 : minute / 5;
    return val * 30; // 360 / 12 = 30 degrees per step
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-[480px] border-none rounded-lg shadow-2xl flex flex-row min-h-[330px]">
        {/* Left Sidebar using Sunset Orange brand color */}
        <div className="w-[140px] bg-[#FF5733] text-white p-5 flex flex-col justify-between select-none min-h-[330px]">
          <div className="flex flex-col mt-4">
            <span className="text-3xl font-bold">
              {hour}:{String(minute).padStart(2, "0")}
            </span>
            <div className="flex flex-col mt-4 gap-1 text-xs font-bold opacity-80">
              <button 
                type="button" 
                onClick={() => handleToggleAmPm("AM")}
                className={`text-left transition-all ${amPm === "AM" ? "text-white scale-110 opacity-100 font-extrabold" : "text-orange-200"}`}
              >
                AM
              </button>
              <button 
                type="button" 
                onClick={() => handleToggleAmPm("PM")}
                className={`text-left transition-all ${amPm === "PM" ? "text-white scale-110 opacity-100 font-extrabold" : "text-orange-200"}`}
              >
                PM
              </button>
            </div>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <button 
              type="button" 
              onClick={() => setPickingMode("hours")}
              className={`hover:underline ${pickingMode === "hours" ? "text-white font-bold" : "text-orange-200"}`}
            >
              HOURS
            </button>
            <span>/</span>
            <button 
              type="button" 
              onClick={() => setPickingMode("minutes")}
              className={`hover:underline ${pickingMode === "minutes" ? "text-white font-bold" : "text-orange-200"}`}
            >
              MINS
            </button>
          </div>
        </div>

        {/* Right Clock Face Area */}
        <div className="flex-1 bg-white p-4 pt-10 flex flex-col items-center justify-between min-h-[330px]">
          {/* Clock Face Circle */}
          <div className="w-48 h-48 rounded-full bg-slate-50 border relative flex items-center justify-center mt-2">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF5733] z-10" />
            
            {/* Hand Line */}
            <div 
              style={{
                transform: `rotate(${getHandRotation()}deg)`,
                transformOrigin: "bottom center",
                height: "68px",
                bottom: "50%",
              }}
              className="absolute w-[2px] bg-[#FF5733] z-0 transition-transform duration-200"
            />
            
            {/* Clock Numbers */}
            {renderClockNumbers()}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 mt-4 text-xs font-bold w-full select-none">
            <button 
              type="button" 
              onClick={onClose} 
              className="text-[#FF5733] hover:bg-slate-50 px-3 py-2 rounded"
            >
              CANCEL
            </button>
            <button 
              type="button" 
              onClick={handleOk} 
              className="text-[#FF5733] hover:bg-slate-50 px-3 py-2 rounded"
            >
              OK
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
