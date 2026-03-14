type DayObj = {
  date: string,
  day: number,
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
}

type Holiday = {
  date: string,
  localName: string,
  name: string,
  countryCode: string,
  fixed: boolean,
  global: boolean,
  types: string[]
}

type Holidays = Holiday[]

type RefHoliday = {
  date: string,
  type: 'holiday' | 'rest'
}

type RefHolidays = RefHoliday[]