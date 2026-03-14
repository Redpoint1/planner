<template>
  <div class="month-card" :class="{ 'opacity-35': !isCurrentYear }">
    <h4 class="month-title">{{ getMonthName(month) }}</h4>

    <div class="grid grid-cols-7 text-center text-xs">
      <div v-for="day in weekDays" :key="day" class="day-header">{{ day }}</div>
      <div v-for="day in calendarGrid" :key="day.date" :class="[getDayClass(day), { 'outside-month': day.outside }]"
        class="day-cell" @click="toggleVacation(day.date)">
        {{ day.day }}
      </div>
    </div>

    <div class="month-summary">
      <div>Pracovné dni: {{ workingDaysInMonth.days }} d / {{ workingDaysInMonth.hours }} h</div>
      <div>Po odrátaní: {{ plannedWorkingDaysInMonth.days }} d / {{ plannedWorkingDaysInMonth.hours }} h</div>
      <div>Zárobok: {{ plannedMonthlyEarnings }} €</div>
    </div>
  </div>
</template>

<script setup lang="ts" vapor>
import dayjs from 'dayjs'

import { computed, defineProps, inject, ref, type Ref } from 'vue';
import { storageKey } from '@/composables/date'
import { useDayHelpers } from '@/composables/date'

const props = defineProps<{
  month: number,
  year: number
}>()
const year = computed(() => props.year)
const month = computed(() => props.month)

const vacations = inject<Ref<string[]>>('vacations', ref([]))
const holidays = inject<Ref<RefHolidays>>('holidays', ref([]))
const selectedYear = inject<Ref<number>>('selectedYear', year)
const mdRate = inject<Ref<number>>('mdRate', ref(235))

const isCurrentYear = computed(() => selectedYear.value === year.value)

const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']
const vacationColor = 'day-vacation'
const stateHolidayColor = 'day-holiday'
const restDayColor = 'day-rest'
const weekendColor = 'day-weekend'
const workDayColor = 'day-work'

const workingDaysInMonth = computed(() => getWorkSummary(year.value, month.value))
const plannedWorkingDaysInMonth = computed(() => getWorkSummary(year.value, month.value, true))
const plannedMonthlyEarnings = computed(() => getEarnings(month.value))

const { getWorkSummary, getDaysInMonth } = useDayHelpers({
  vacations,
  holidays,
})

const calendarGrid = computed(() => {
  const currentDays = getDaysInMonth(year.value, month.value)
  const padding = paddingFirstDay(year.value, month.value)

  // Previous month days
  const prevMonth = dayjs(`${year.value}-${month.value}-01`).subtract(1, 'month')
  const prevMonthDaysCount = prevMonth.daysInMonth()
  const prevDays: (DayObj & { outside: boolean })[] = []
  for (let i = prevMonthDaysCount - padding + 1; i <= prevMonthDaysCount; i++) {
    const date = prevMonth.date(i)
    prevDays.push({
      date: date.format('YYYY-MM-DD'),
      day: i,
      weekday: date.day() as DayObj['weekday'],
      outside: true,
    })
  }

  // Current month days
  const current = currentDays.map(d => ({ ...d, outside: false }))

  // Next month days to fill the last row(s)
  const totalSoFar = prevDays.length + current.length
  const remainder = totalSoFar % 7
  const trailingCount = remainder === 0 ? 0 : 7 - remainder
  const nextMonth = dayjs(`${year.value}-${month.value}-01`).add(1, 'month')
  const nextDays: (DayObj & { outside: boolean })[] = []
  for (let i = 1; i <= trailingCount; i++) {
    const date = nextMonth.date(i)
    nextDays.push({
      date: date.format('YYYY-MM-DD'),
      day: i,
      weekday: date.day() as DayObj['weekday'],
      outside: true,
    })
  }

  return [...prevDays, ...current, ...nextDays]
})

function toggleVacation(date: string) {
  if (vacations.value.includes(date)) {
    vacations.value = vacations.value.filter((d) => d !== date)
  } else {
    vacations.value.push(date)
  }
  saveToStorage()
}

function getDayClass(day: DayObj & { outside?: boolean }) {
  if (vacations.value.includes(day.date)) return vacationColor
  const holiday = holidays.value.find(h => h.date === day.date)
  if (holiday?.type === 'rest') return restDayColor
  if (holiday?.type === 'holiday') return stateHolidayColor
  if (day.weekday === 0 || day.weekday === 6) return weekendColor
  return workDayColor
}

function getMonthName(month: number) {
  return dayjs(`${year.value}-${month}-01`).format('MMMM')
}

function getEarnings(month: number) {
  return getWorkSummary(year.value, month, true).days * mdRate.value
}

function paddingFirstDay(year: number, month: number) {
  const firstDay = dayjs(`${year}-${month}-01`)
  const padding = (firstDay.get('day') + 6) % 7
  return padding
}

function saveToStorage() {
  const years = new Set(vacations.value.map(d => parseInt(d.substring(0, 4))))
  for (const y of years) {
    const vacationsInYear = [...new Set(vacations.value.filter(day => day.startsWith(`${y}-`)))]
    localStorage.setItem(storageKey(y), JSON.stringify(vacationsInYear))
  }
}
</script>

<style scoped>
.month-card {
  background: #1a1c2b;
  border: 1px solid #252839;
  border-radius: 0.625rem;
  padding: 0.75rem;
}

.month-title {
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  color: #c4c7d4;
  text-transform: capitalize;
}

.day-header {
  font-weight: 600;
  font-size: 0.65rem;
  color: #6b7080;
  text-transform: uppercase;
  padding: 0.25rem 0;
}

.day-cell {
  padding: 0.3rem 0.15rem;
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 0.15s;
  font-variant-numeric: tabular-nums;
  margin: 1px;
}

.day-cell:hover {
  outline: 1px solid #4a4f6a;
}

.day-work {
  color: #d0d3de;
}

.day-weekend {
  color: #555872;
}

.day-vacation {
  background: #4a3d1a;
  color: #f5c842;
  font-weight: 600;
}

.day-holiday {
  background: #1a2e4a;
  color: #6ba3e8;
}

.day-rest {
  background: #3a1a1a;
  color: #e87070;
}

.outside-month {
  opacity: 0.3;
}

.month-summary {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #252839;
  font-size: 0.65rem;
  color: #6b7080;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
</style>
