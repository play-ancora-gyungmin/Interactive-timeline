const dayFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const shortDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const entryDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
})

export const formatTodayLabel = () => dayFormatter.format(new Date())

export const formatEntryDateLabel = (value: string) =>
  entryDateFormatter.format(new Date(`${value}T00:00:00+09:00`))

export const formatCreatedAtLabel = (value: string) =>
  shortDateTimeFormatter.format(new Date(value))
