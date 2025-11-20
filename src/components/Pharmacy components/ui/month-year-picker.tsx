import * as React from "react"
import { format, parse, addMonths, subMonths, isSameMonth } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MonthYearPickerProps {
  value: string // format: "yyyy-MM"
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function MonthYearPicker({
  value,
  onChange,
  className,
  disabled = false,
}: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState<Date>(value ? parse(value, 'yyyy-MM', new Date()) : new Date())
  
  const currentDate = new Date()
  const selectedDate = value ? parse(value, 'yyyy-MM', new Date()) : null
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - 2 + i
  )
  
  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewDate.getFullYear(), monthIndex, 1)
    onChange(format(newDate, 'yyyy-MM'))
    setIsOpen(false)
  }
  
  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, viewDate.getMonth(), 1)
    setViewDate(newDate)
  }
  
  const prevYear = () => {
    setViewDate(subMonths(viewDate, 12))
  }
  
  const nextYear = () => {
    setViewDate(addMonths(viewDate, 12))
  }
  
  const prevMonth = () => {
    setViewDate(subMonths(viewDate, 1))
  }
  
  const nextMonth = () => {
    setViewDate(addMonths(viewDate, 1))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[240px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(parse(value, 'yyyy-MM', new Date()), 'MMM yyyy') : <span>Pick a month</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevYear}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium">{viewDate.getFullYear()}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextYear}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {years.map((year) => (
              <Button
                key={year}
                variant={viewDate.getFullYear() === year ? "default" : "ghost"}
                size="sm"
                onClick={() => handleYearSelect(year)}
                className="h-8"
              >
                {year}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant={
                  selectedDate && 
                  isSameMonth(parse(value, 'yyyy-MM', new Date()), new Date(viewDate.getFullYear(), index, 1))
                    ? "default"
                    : "ghost"
                }
                size="sm"
                onClick={() => handleMonthSelect(index)}
                className="h-8"
              >
                {month}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
