import moment from "moment";
import random from "random";

/**
 * Generate a single custom date ISO string based on individual components.
 * @param {Object} options
 * @param {number} [options.year] - Full year (e.g. 2023)
 * @param {number} [options.month] - Month index (1-12)
 * @param {number} [options.day] - Day of month (1-31)
 * @param {number} [options.hour] - Hour of day (0-23)
 * @param {number} [options.minute] - Minute (0-59)
 * @param {number} [options.second] - Second (0-59)
 * @returns {string} ISO 8601 formatted timestamp string suitable for Git
 */
export function generateCustomDate({ year, month, day, hour = 12, minute = 0, second = 0 } = {}) {
  const now = moment();
  const y = year !== undefined ? year : now.year();
  const m = month !== undefined ? month - 1 : now.month(); // moment is 0-indexed for month
  const d = day !== undefined ? day : now.date();

  const customMoment = moment({ year: y, month: m, day: d, hour, minute, second });
  if (!customMoment.isValid()) {
    throw new Error(`Invalid date parameters: year=${year}, month=${month}, day=${day}`);
  }
  return customMoment.toISOString();
}

/**
 * Generate a random date ISO string within a start and end range.
 * @param {string|Date|moment.Moment} [startDate] - Start date (defaults to 1 year ago)
 * @param {string|Date|moment.Moment} [endDate] - End date (defaults to today)
 * @returns {string} ISO 8601 formatted timestamp
 */
export function generateRandomDate(startDate, endDate) {
  const start = startDate ? moment(startDate) : moment().subtract(1, "year");
  const end = endDate ? moment(endDate) : moment();

  if (!start.isValid() || !end.isValid()) {
    throw new Error("Invalid start or end date provided to generateRandomDate.");
  }

  if (start.isAfter(end)) {
    throw new Error("Start date cannot be after end date.");
  }

  const startMs = start.valueOf();
  const endMs = end.valueOf();
  const randomMs = random.int(startMs, endMs);

  return moment(randomMs).toISOString();
}

/**
 * Legacy/Simple random date generator: generates a random date within the past year.
 * @returns {string} ISO 8601 timestamp string
 */
export function generateDate() {
  const week = random.int(0, 51);
  const day = random.int(0, 6);
  const hour = random.int(0, 23);
  const minute = random.int(0, 59);
  const second = random.int(0, 59);

  return moment()
    .subtract(1, "year")
    .add(week, "weeks")
    .add(day, "days")
    .hour(hour)
    .minute(minute)
    .second(second)
    .toISOString();
}

/**
 * Generate an array of random dates within a specified date range.
 * @param {number} count - Number of dates to generate
 * @param {Object} [options]
 * @param {string|Date} [options.startDate] - Range start
 * @param {string|Date} [options.endDate] - Range end
 * @param {boolean} [options.sort=true] - Sort dates chronologically
 * @returns {string[]} Array of ISO timestamp strings
 */
export function generateDateBatch(count, { startDate, endDate, sort = true } = {}) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    dates.push(generateRandomDate(startDate, endDate));
  }

  if (sort) {
    dates.sort((a, b) => moment(a).valueOf() - moment(b).valueOf());
  }

  return dates;
}

/**
 * Validates whether a given date input can be parsed into a valid timestamp.
 * @param {any} input 
 * @returns {boolean}
 */
export function isValidDate(input) {
  return moment(input).isValid();
}

/**
 * Format any valid date representation into standard Git ISO format.
 * @param {any} input 
 * @returns {string}
 */
export function formatGitDate(input) {
  const m = moment(input);
  if (!m.isValid()) {
    throw new Error(`Cannot format invalid date: ${input}`);
  }
  return m.toISOString();
}