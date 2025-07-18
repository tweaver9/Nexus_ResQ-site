import { parse, format, isToday, isPast, differenceInDays, isSameMonth, isWithinInterval } from 'date-fns';

// MM/YY to Date
export function parseMonthYear(monthYear) {
  if (!monthYear) return null;
  return parse(monthYear, 'MM/yy', new Date());
}

// Returns status string for due date (e.g., Hydro Due)
export function getDueStatus(monthYear) {
  const dueDate = parseMonthYear(monthYear);
  if (!dueDate) return 'No Due Date';
  if (isToday(dueDate)) return 'Due Today';
  if (isPast(dueDate)) return 'Past Due';
  const days = differenceInDays(dueDate, new Date());
  return `Due in ${days} days`;
}

// Checks if inspection is due this month
export function isDueThisMonth(date) {
  return isSameMonth(date, new Date());
}

// Returns days overdue (if overdue)
export function getDaysOverdue(date) {
  if (!isPast(date)) return 0;
  return differenceInDays(new Date(), date);
}

// Group logs by day (returns object: { 'YYYY-MM-DD': [logs] })
export function groupLogsByDay(logs, dateField = 'date') {
  return logs.reduce((acc, log) => {
    const day = format(new Date(log[dateField]), 'yyyy-MM-dd');
    acc[day] = acc[day] || [];
    acc[day].push(log);
    return acc;
  }, {});
}
