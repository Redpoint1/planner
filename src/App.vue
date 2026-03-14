<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <button class="nav-btn" @click="changeYear(-1)" :disabled="loading">← Predch. rok</button>
      <h2 class="text-2xl font-bold tracking-wide">{{ selectedYear }}</h2>
      <button class="nav-btn" @click="changeYear(1)" :disabled="loading">Nasl. rok →</button>
    </div>

    <div class="flex justify-center mb-6">
      <div class="year-mode-toggle">
        <button :class="['toggle-btn', { active: yearMode === 'financial' }]" @click="yearMode = 'financial'">Fiškálny
          rok</button>
        <button :class="['toggle-btn', { active: yearMode === 'calendar' }]" @click="yearMode = 'calendar'">Kalendárny
          rok</button>
      </div>
    </div>

    <div class="flex justify-center mb-6 gap-4 flex-wrap">
      <div class="legend-item"><span class="legend-dot day-work"></span>Pracovný deň</div>
      <div class="legend-item"><span class="legend-dot day-weekend"></span>Víkend</div>
      <div class="legend-item"><span class="legend-dot day-rest"></span>Deň pracovného pokoja</div>
      <div class="legend-item"><span class="legend-dot day-holiday"></span>Štátny sviatok</div>
      <div class="legend-item"><span class="legend-dot day-vacation"></span>Dovolenka</div>
    </div>

    <div v-if="loading" class="text-center text-gray-500 py-12">Načítavam sviatky...</div>

    <template v-else>
      <CalendarQuarter v-if="yearMode === 'financial'" :year="selectedYear - 1" :q-idx="3" :quarter="quarters[3]" />
      <CalendarQuarter :year="selectedYear" :q-idx="qIdx" :quarter="quarter" v-for="(quarter, qIdx) in quarters"
        :key="qIdx" />
    </template>

    <div class="summary-card mt-8">
      <h3 class="text-lg font-semibold mb-2">Ročný súhrn</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Pracovné dni</span>
          <span class="summary-value">{{ allWorkingDays.days }} d / {{ allWorkingDays.hours }} h</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Po odrátaní dovolenky</span>
          <span class="summary-value">{{ plannedWorkingDays.days }} d / {{ plannedWorkingDays.hours }} h</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Zárobok</span>
          <span class="summary-value">{{ plannedEarnings }} €</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">MD sadzba</span>
          <div class="rate-input-wrap">
            <input type="number" v-model.number="mdRate" class="rate-input" min="0" step="1" /> <span
              class="summary-value">€</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" vapor>
import { ref, computed, watch, onMounted, provide } from 'vue'
import dayjs from 'dayjs'
import CalendarQuarter from './components/CalendarQuarter.vue'
import { useDayHelpers, storageKey } from './composables/date'

const selectedYear = ref(dayjs().year())
const yearMode = ref<'financial' | 'calendar'>((localStorage.getItem('calendar-yearMode') as 'financial' | 'calendar') || 'financial')
const mdRate = ref(Number(localStorage.getItem('calendar-mdRate')) || 1)
const holidays = ref<RefHolidays>([])
const vacations = ref(loadFromStorage(selectedYear.value))
const loading = ref(true)

provide('holidays', holidays)
provide('vacations', vacations)
provide('selectedYear', selectedYear)
provide('mdRate', mdRate)

watch(yearMode, (v) => localStorage.setItem('calendar-yearMode', v))
watch(mdRate, (v) => localStorage.setItem('calendar-mdRate', String(v)))

const allWorkingDays = computed(() => getYearSummary())
const plannedWorkingDays = computed(() => getYearSummary(true))
const plannedEarnings = computed(() => getYearEarnings())

const { getWorkSummary } = useDayHelpers({
  holidays,
  vacations
})

watch(selectedYear, async () => {
  vacations.value = loadFromStorage(selectedYear.value)
  await fetchHolidays()
})

onMounted(() => {
  fetchHolidays()
})

async function fetchHolidays() {
  loading.value = true
  try {
    const previousHolidays = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear.value - 1}/SK`)
    const currentHolidays = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear.value}/SK`)
    const futureHolidays = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear.value + 1}/SK`)
    const data1 = await previousHolidays.json() as Holidays
    const data2 = await currentHolidays.json() as Holidays
    const data3 = await futureHolidays.json() as Holidays
    holidays.value = [...data1, ...data2, ...data3].map(h => ({ date: h.date, type: h.types[0] !== "Public" ? 'holiday' : 'rest' }))
  } catch (e) {
    console.error('Nepodarilo sa načítať sviatky', e)
  }
  loading.value = false
}

function loadFromStorage(year: number) {
  const previousYear: string[] = JSON.parse(localStorage.getItem(storageKey(year - 1)) || '[]')
  const currentYear: string[] = JSON.parse(localStorage.getItem(storageKey(year)) || '[]')
  const nextYear: string[] = JSON.parse(localStorage.getItem(storageKey(year + 1)) || '[]')
  return [...previousYear, ...currentYear, ...nextYear]
}

function getYearSummary(withVacation = false) {
  let days = 0
  for (let m = 1; m <= 12; m++) {
    days += getWorkSummary(selectedYear.value, m, withVacation).days
  }
  return { days, hours: days * 8 }
}

function getYearEarnings() {
  return getYearSummary(true).days * mdRate.value
}

function changeYear(diff: number) {
  selectedYear.value += diff
}

const quarters = computed(() => yearMode.value === 'financial'
  ? [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 12, 1]]
  : [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
)
</script>

<style>
@import "tailwindcss";

body {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.nav-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  background: #1e2030;
  border: 1px solid #2a2d3e;
  color: #a0a4b8;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-btn:hover:not(:disabled) {
  background: #282b3e;
  color: #e2e4e9;
  border-color: #3d4159;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.summary-card {
  background: #161825;
  border: 1px solid #1e2030;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.summary-label {
  font-size: 0.75rem;
  color: #6b7080;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e4e9;
}

.year-mode-toggle {
  display: inline-flex;
  background: #1e2030;
  border: 1px solid #2a2d3e;
  border-radius: 0.5rem;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7080;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #2a2d3e;
  color: #e2e4e9;
}

.toggle-btn:hover:not(.active) {
  color: #a0a4b8;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #a0a4b8;
}

.legend-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 0.2rem;
  flex-shrink: 0;
}

.legend-dot.day-work {
  background: #2a2d3e;
  border: 1px solid #d0d3de;
}

.legend-dot.day-weekend {
  background: #2a2d3e;
  border: 1px solid #555872;
}

.legend-dot.day-vacation {
  background: #4a3d1a;
}

.legend-dot.day-holiday {
  background: #1a2e4a;
}

.legend-dot.day-rest {
  background: #3a1a1a;
}

.rate-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rate-input {
  width: 5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: #1e2030;
  border: 1px solid #2a2d3e;
  color: #e2e4e9;
  font-size: 1rem;
  font-weight: 600;
  text-align: right;
}

.rate-input:focus {
  outline: none;
  border-color: #4a4f6a;
}
</style>
