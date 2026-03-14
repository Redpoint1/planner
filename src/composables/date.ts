import dayjs from 'dayjs'
import { type Ref } from 'vue'

export function storageKey(year: number) { return `calendar-${year}` }

export function useDayHelpers({
  holidays,
  vacations
}: {
  holidays: Ref<RefHolidays>,
  vacations: Ref<string[]>
}) {
  function getDaysInMonth(year: number, month: number) {
    const firstDay = dayjs(`${year}-${month}-01`)
    const daysInMonth = firstDay.daysInMonth()
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      const date = dayjs(`${year}-${month}-${i.toString().padStart(2, '0')}`)
      days.push({
        date: date.format('YYYY-MM-DD'),
        day: i,
        weekday: date.day(),
      })
    }
    return days
  }

  function isWorkingDay(day: DayObj) {
    const holiday = holidays.value.find(h => h.date === day.date)
    if (holiday?.type === 'rest' || day.weekday === 0 || day.weekday === 6) return false
    return true
  }

  function getWorkSummary(year: number, month: number, withVacation = false) {
    const days = getDaysInMonth(year, month)
    let count = 0
    for (const d of days) {
      if (isWorkingDay(d)) {
        if (withVacation && vacations.value.includes(d.date)) continue
        count++
      }
    }
    return { days: count, hours: count * 8 }
  }

  return {
    getWorkSummary,
    getDaysInMonth
  }

}