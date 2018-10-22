import * as moment from 'moment-timezone';

type IntervalCallbacks = {
  week: (date: moment.Moment) => void;
  day: (date: moment.Moment) => void;
};

interface ICallayEvent {
  id: string;
  start: moment.Moment;
  duration: number;
  isAllDay?: boolean;
}

type CallayEventData = {
  startDateStr: string;
  endDateStr: string;
  level: number;
};

type CallaySummaryWeek = {
  startDate: moment.Moment;
  days: CallaySummaryDay[];
  entries: CallaySummaryEntry[];
};

type CallaySummaryDay = {
  dateStr: string,
  startDate: moment.Moment;
  entries: CallaySummaryEntry[];
};

type CallayDetailDay = {
  dateStr: string,
  entries: CallayDetailEntry[];
  // allDayEntries: CallaySummaryDay[];
};

interface ICallayEntry {
  id: string;
  level: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  isAllDay: boolean;
  originalEvent: any;
  currentDateStr: string;
  startDateStr: string;
  endDateStr: string;
}

type CallaySummaryEntry = {
  id: string;
  level: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  isAllDay: boolean;
  originalEvent: any;
  currentDateStr: string;
  startDateStr: string;
  endDateStr: string;
};

type CallayDetailEntry = {
  id: string;
  level: number;
  maxLevel?: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  isAllDay: boolean;
  originalEvent: any;
  currentDateStr: string;
  startDateStr: string;
  endDateStr: string;
};

type CallayEventMap = {
  dates: CallayEventDates,
  bounds: CallayEventBounds,
};

type CallayEventDates = {
  [key: string]: ICallayEntry[];
};

type CallayEventBounds = {
  [key: string]: CallayEventData;
};

function findNextUnusedLevel(indexes: boolean[]) {
  let i;
  for (i = 0; i < 50; i++) {
    if (!indexes[i]) return i;
  }
  return i;
}

function forEachInterval(
  startDate: moment.Moment,
  endDate: moment.Moment,
  callbacks: IntervalCallbacks
) {
  startDate = moment(startDate).startOf('week');
  endDate = moment(endDate).endOf('week');
  let currentDate = startDate;
  while (currentDate.isSameOrBefore(endDate)) {
    if (callbacks.week) {
      callbacks.week(currentDate);
    }
    for (let i = 0; i < 7; i++) {
      if (callbacks.day) {
        callbacks.day(currentDate);
      }
      // Don't simply add 1 day due to some timezones doing DST shifts at midnight
      // resulting in ambiguity and an infinite loop in this code.
      currentDate = moment(currentDate).add(30, 'hour').startOf('day');
    }
  }
}

function generateWeeks(
  startDate: moment.Moment,
  endDate: moment.Moment,
): CallaySummaryWeek[] {

  let weeks: CallaySummaryWeek[] = [];
  let weekNum = 0;
  forEachInterval(startDate, endDate, {
    week: (weekStartDate) => {
      weeks.push({startDate: weekStartDate, days: [], entries: []});
      weekNum++;
    },
    day: (date) => {
      let week = weeks[weeks.length - 1];
      week.days.push({
        dateStr: date.format('YYYY-MM-DD'),
        startDate: date,
        entries: [],
      });
    }
  });
  return weeks;
}

function generateDays(
  startDate: moment.Moment,
  endDate: moment.Moment,
): CallayDetailDay[] {

  let days: CallayDetailDay[] = [];
  let date = moment(startDate);
  while (date.isSameOrBefore(endDate, 'day')) {
    days.push({
      dateStr: date.format('YYYY-MM-DD'),
      entries: []
    });
    date.add(1, 'day');
  }

  return days;
}

function generateEventMap(events: ICallayEvent[], startDate: moment.Moment, endDate: moment.Moment): CallayEventMap {
  let eventMap: CallayEventMap = {
    dates: {},
    bounds: {},
  };

  events.forEach(event => {
    let currentDate = moment(event.start);
    let eventEndDate = moment(event.start).add(event.duration, 'minutes').subtract(1, 'second');
    if (event.isAllDay) {
      currentDate = currentDate.startOf('day');
      eventEndDate = eventEndDate.endOf('day');
    }
    let startDateStr = currentDate.format('YYYY-MM-DD');
    let endDateStr = eventEndDate.format('YYYY-MM-DD');

    while (currentDate.isBefore(eventEndDate) && currentDate.isBefore(endDate)) {
      let currentDateStr = currentDate.format('YYYY-MM-DD');
      if (!eventMap.dates[currentDateStr]) {
        eventMap.dates[currentDateStr] = [];
      }
      if (!eventMap.bounds[event.id]) {
        eventMap.bounds[event.id] = {
          startDateStr: currentDateStr,
          endDateStr: eventEndDate.format('YYYY-MM-DD'),
          level: 0,
        };
      }

      // Calculate how many days this event spans.  By default it will be 1,
      // but if it's a multi-day event the span will be to the end of the
      // week, or the end of the event, whichever is first.  It goes to the
      // end of the week because a new event box will likely need to be drawn
      // in the row for the following week.
      //
      // Note that we had to calculate the difference in hours instead of
      // days because moment calculates the difference in UTC, so it may
      // cross day boundaries differently.  Hours is more accurate.
      let span = 1 + moment(eventEndDate).endOf('day').diff(moment(currentDate).startOf('day'), 'days');
      span = Math.min(7 - currentDate.day(), span);

      eventMap.dates[currentDateStr].push({
        currentDateStr: currentDateStr,
        startDateStr: startDateStr,
        endDateStr: endDateStr,
        id: event.id,
        level: 0,
        span: span,
        isStart: true,
        isEnd: true,
        isAllDay: event.isAllDay,
        originalEvent: event,
      });

      // Don't simply add 1 day due to some timezones doing DST shifts at midnight
      // resulting in ambiguity and an infinite loop in this code.
      currentDate.add(30, 'hour').startOf('day');
    }
  });

  return eventMap;
}

function monthLayoutFor(
  startDate: moment.Moment,
  endDate: moment.Moment,
  events: ICallayEvent[]
): CallaySummaryWeek[] {
  let weeks = generateWeeks(startDate, endDate);
  let eventMap = generateEventMap(events, startDate, endDate);
  let removableIndexes: {[weekIndex: number]: {[wday: number]: {[i: number]: boolean}}} = {};

  weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, wday) => {
      day.entries = eventMap.dates[day.dateStr] || [];
      day.entries.sort((a, b) => {
        if (a.originalEvent.start.isBefore(b.originalEvent.start)) return -1;
        if (a.originalEvent.start.isAfter(b.originalEvent.start)) return 1;
        return 0;
      });

      let usedLevels: boolean[] = [];
      day.entries.forEach((entry, i) => {
        let {startDateStr, endDateStr, level} = eventMap.bounds[entry.id];

        if (!level) {
          level = findNextUnusedLevel(usedLevels);
          eventMap.bounds[entry.id].level = level;
        }
        usedLevels[level] = true;
        entry.level = level;

        // Figure out if this is an event that spans multiple days.  If so,
        // set the appropriate flags.  Also check if this event will span
        // multiple rows.
        if (startDateStr !== endDateStr) {
          if (startDateStr !== entry.currentDateStr) {
            entry.isStart = false;
          }
          if (endDateStr !== moment(entry.currentDateStr).add(entry.span - 1, 'days').format('YYYY-MM-DD')) {
            entry.isEnd = false;
          }
        }

        // Figure out if we should remove this entry when it's a multi-day
        // event.  While calculating the positions, we add multi-day events
        // to each day they span, but before we return the results we will
        // want to remove those extra entries.  Leave the first entry for
        // each week (if it spans week boundaries).
        if (!removableIndexes[weekIndex]) removableIndexes[weekIndex] = {};
        if (!removableIndexes[weekIndex][wday]) removableIndexes[weekIndex][wday] = {};
        removableIndexes[weekIndex][wday][i] = entry.startDateStr !== entry.currentDateStr && wday > 0;

        if (!removableIndexes[weekIndex][wday][i]) {
          week.entries.push(entry);
        }
      });
    });
  });

  // Now loop through and remove the duplicates for multi-day events.  We
  // had them in the data set initially so we can easily calculate the position
  // on each day.  But in the return value, we want them removed.
  weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, wday) => {
      for (let i = 0, originalIndex = 0; i < day.entries.length; i++, originalIndex++) {
        if (removableIndexes[weekIndex][wday][originalIndex]) {
          day.entries.splice(i--, 1);
        }
      }

      day.entries.sort((a, b) => {
        if (a.level < b.level) return -1;
        if (a.level > b.level) return 1;
        return 0;
      });
    });
  });

  return weeks;
}


function dayLayoutFor(
  startDate: moment.Moment,
  endDate: moment.Moment,
  events: ICallayEvent[]
): CallayDetailDay[] {
  let days = generateDays(startDate, endDate);
  let eventMap = generateEventMap(events, startDate, endDate);

  days.forEach((day, dayIndex) => {
    day.entries = eventMap.dates[day.dateStr] || [];
    day.entries.sort((a, b) => {
      if (a.originalEvent.start.isBefore(b.originalEvent.start)) return -1;
      if (a.originalEvent.start.isAfter(b.originalEvent.start)) return 1;
      return 0;
    });

    let levelMap: CallayDetailEntry[] = [];
    day.entries.forEach((entry, i) => {
      if (entry.isAllDay) return;

      let {startDateStr, endDateStr, level} = eventMap.bounds[entry.id];

      // Figure out if this event starts before midnight or ends after midnight.
      if (startDateStr !== endDateStr) {
        if (startDateStr !== entry.currentDateStr) {
          entry.isStart = false;
        }
        if (entry.currentDateStr !== endDateStr) {
          entry.isEnd = false;
        }
      }

      let nextLevel = -1;
      let j = 0;
      for (j = 0; j < levelMap.length; j++) {
        let levelEntry = levelMap[j];
        if (levelEntry) {
          let levelEnd = moment(levelEntry.originalEvent.start)
            .add(levelEntry.originalEvent.duration, 'minutes');
          if (entry.originalEvent.start.isSameOrAfter(levelEnd)) {
            if (nextLevel < 0) {
              nextLevel = j;
            }
            delete levelMap[j];
          }
        } else {
          if (nextLevel < 0) {
            nextLevel = j;
          }
        }
      }

      while (levelMap.length && !levelMap[levelMap.length - 1]) {
        levelMap.length--;
      }

      if (nextLevel < 0) {
        nextLevel = j;
      }
      levelMap[nextLevel] = entry;
      levelMap.forEach(levelEntry => {
        if (!levelEntry.maxLevel || levelMap.length - 1 > levelEntry.maxLevel) {
          levelEntry.maxLevel = levelMap.length - 1;
        }
      });
      entry.level = nextLevel;
    });
  });

  return days;
}

export { monthLayoutFor, dayLayoutFor, CallaySummaryWeek, CallaySummaryDay, CallaySummaryEntry, CallayDetailEntry, CallayDetailDay };