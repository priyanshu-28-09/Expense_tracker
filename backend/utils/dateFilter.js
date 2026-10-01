// Return a start/end Date range for the requested period.
// Controllers expect an object { start, end } to build Mongo queries.
const getDateRange = (range = 'monthly') => {
  const now = new Date();
  let start;

  switch (range) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;

    case 'weekly': {
      const firstDayOfWeek = new Date(now);
      const day = firstDayOfWeek.getDay();
      // move to Sunday (or first day) of this week
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - day);
      firstDayOfWeek.setHours(0, 0, 0, 0);
      start = firstDayOfWeek;
      break;
    }

    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
  }

  const end = new Date();
  return { start, end };
};

export default getDateRange;