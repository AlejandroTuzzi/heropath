// Shared dayjs configured with the UTC plugin.
// Calendar dates (goal start/end, daily entries) are stored as UTC-midnight
// timestamps, so we ALWAYS parse/compare/format them in UTC to avoid the
// "off-by-one-day" shift that happens in timezones behind/ahead of UTC.
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export default dayjs
