<template>
  <div class="quarter-card">
    <h3 class="text-base font-semibold mb-4 text-[#8b8fa3]">{{ selectedYear }} Q{{ qIdx + 1 }}</h3>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CalendarMonth v-for="month in quarter" :key="month" :month
        :year="qIdx === 3 && month === 1 ? selectedYear + 1 : selectedYear" />
    </div>

    <div v-if="quarter.length > 1" class="quarter-summary">
      <div class="summary-row">
        <span class="qs-label">Pracovné dni</span>
        <span class="qs-value">{{ workingDaysInQuarter.days }} d / {{ workingDaysInQuarter.hours }} h</span>
      </div>
      <div class="summary-row">
        <span class="qs-label">Po odrátaní dovolenky</span>
        <span class="qs-value">{{ plannedWorkingDaysInQuarter.days }} d / {{ plannedWorkingDaysInQuarter.hours }}
          h</span>
      </div>
      <div class="summary-row">
        <span class="qs-label">Zárobok</span>
        <span class="qs-value">{{ plannedQuarterEarnings }} €</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" vapor>
import { computed, inject, ref, type Ref } from 'vue'
import { useDayHelpers } from '@/composables/date'
import CalendarMonth from './CalendarMonth.vue'

const vacations = inject<Ref<string[]>>('vacations', ref([]))
const holidays = inject<Ref<RefHolidays>>('holidays', ref([]))
const mdRate = inject<Ref<number>>('mdRate', ref(235))

const props = defineProps<{
  year: number,
  qIdx: number
  quarter: number[]
}>()
const selectedYear = computed(() => props.year)
const qIdx = computed(() => props.qIdx)
const quarter = computed(() => props.quarter)

const workingDaysInQuarter = computed(() => getQuarterSummary())
const plannedWorkingDaysInQuarter = computed(() => getQuarterSummary())
const plannedQuarterEarnings = computed(() => getQuarterEarnings())

const { getWorkSummary } = useDayHelpers({
  vacations,
  holidays,
})


function getQuarterSummary(withVacation = false) {
  const months = quarter.value
  let days = 0
  for (const m of months) {
    const year = (qIdx.value === 3 && m === 1) ? selectedYear.value + 1 : selectedYear.value
    days += getWorkSummary(year, m, withVacation).days
  }
  return { days, hours: days * 8 }
}

function getQuarterEarnings() {
  return getQuarterSummary(true).days * mdRate.value
}
</script>

<style scoped>
.quarter-card {
  background: #161825;
  border: 1px solid #1e2030;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.quarter-summary {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #1e2030;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.summary-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.qs-label {
  font-size: 0.7rem;
  color: #6b7080;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.qs-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #c4c7d4;
}
</style>
