import * as moment from 'moment-timezone';

type IntervalCallbacks = {
  week: (date: moment.Moment) => void;
  day: (date: moment.Moment) => void;
};

interface ICallayEvent {
  id: string;
  start: moment.Moment;
  duration: number;
}

type CallayEventData = {
  startDateStr: string;
  endDateStr: string;
  level: number;
};

type CallayWeek = {
  startDate: moment.Moment;
  days: CallayMonthDay[];
  entries: CallayMonthEntry[];
}

type CallayMonthDay = {
  dateStr: string,
  startDate: moment.Moment;
  entries: CallayMonthEntry[];
}

type CallayMonthEntry = {
  id: string;
  level: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  originalEvent: any;
  currentDateStr: string;
  startDateStr: string;
  endDateStr: string;
}


function findNextUnusedLevel(indexes: boolean[]) {
  let i;
  for (i=0; i < 50; i++) {
    if (!indexes[i]) return i;
  }
  return i;
}

function forEachInterval(
  startDate: moment.Moment,
  endDate: moment.Moment,
  callbacks: IntervalCallbacks
){
  startDate = moment(startDate).startOf('week');
  endDate = moment(endDate).endOf('week');
  let currentDate = startDate;
  while (currentDate.isSameOrBefore(endDate)) {
    if (callbacks.week) {
      callbacks.week(currentDate);
    }
    for (let i=0; i < 7; i++) {
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
): CallayWeek[] {

  let weeks: CallayWeek[] = [];
  let weekNum = 0;
  forEachInterval(startDate, endDate, {
    week: (weekStartDate) => {
      weeks.push({startDate: weekStartDate, days:[], entries:[]});
      weekNum++;
    },
    day: (date) => {
      let week = weeks[weeks.length-1];
      week.days.push({
        dateStr: date.format('YYYY-MM-DD'),
        startDate: date,
        entries: [],
      });
    }
  });
  return weeks;
}

function monthLayoutFor(
  startDate: moment.Moment,
  endDate: moment.Moment,
  events: ICallayEvent[]
): CallayWeek[] {
  let weeks = generateWeeks(startDate, endDate);
  let eventMap: {[key: string]: CallayMonthEntry[]} = {};
  let eventBounds: {[key: string]: CallayEventData} = {};
  let removableIndexes: {[weekIndex: number]: {[wday: number]: {[i: number]: boolean}}} = {};

  // Initialize the structures we'll use to track the events and
  // their locations.
  events.forEach(event => {
    let currentDate = moment(event.start);
    let eventEndDate = moment(event.start).add(event.duration, 'minutes');
    let startDateStr= currentDate.format('YYYY-MM-DD');
    let endDateStr = eventEndDate.format('YYYY-MM-DD');

    while (currentDate.isBefore(eventEndDate) && currentDate.isBefore(endDate)) {
      let currentDateStr = currentDate.format('YYYY-MM-DD');
      if (!eventMap[currentDateStr]) {
        eventMap[currentDateStr] = [];
      }
      if (!eventBounds[event.id]) {
        eventBounds[event.id] = {
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
      let span = 1 + Math.floor(eventEndDate.diff(currentDate, 'hours') / 24);
      span = Math.min(7 - currentDate.day(), span);

      eventMap[currentDateStr].push({
        currentDateStr: currentDateStr,
        startDateStr: startDateStr,
        endDateStr: endDateStr,
        id: event.id,
        level: 0,
        span: span,
        isStart: true,
        isEnd: true,
        originalEvent: event,
      });

      // Don't simply add 1 day due to some timezones doing DST shifts at midnight
      // resulting in ambiguity and an infinite loop in this code.
      currentDate.add(30, 'hour').startOf('day');
    }
  });

  weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, wday) => {
      day.entries = eventMap[day.dateStr] || [];
      day.entries.sort((a, b) => {
        if (a.originalEvent.start.isBefore(b.originalEvent.start)) return -1;
        if (a.originalEvent.start.isAfter(b.originalEvent.start)) return 1;
        return 0;
      });

      let usedLevels: boolean[] = [];
      day.entries.forEach((entry, i) => {
        let {startDateStr, endDateStr, level} = eventBounds[entry.id];

        if (!level) {
          level = findNextUnusedLevel(usedLevels);
          eventBounds[entry.id].level = level;
        }
        usedLevels[level] = true;
        entry.level = level;

        // Figure out if this is an event that spans multiple days.  If so,
        // set the appropriate flags.  Also check if this event will span
        // multiple rows.
        if (startDateStr != endDateStr) {
          if (startDateStr !== entry.currentDateStr)
            entry.isStart = false;
          if (endDateStr !== moment(entry.currentDateStr).add(entry.span-1, 'days').format('YYYY-MM-DD'))
            entry.isEnd = false;
        }

        // Figure out if we should remove this entry when it's a multi-day
        // event.  While calculating the positions, we add multi-day events
        // to each day they span, but before we return the results we will
        // want to remove those extra entries.  Leave the first entry for
        // each week (if it spans week boundaries).
        if (!removableIndexes[weekIndex]) removableIndexes[weekIndex] = {};
        if (!removableIndexes[weekIndex][wday]) removableIndexes[weekIndex][wday] = {};
        removableIndexes[weekIndex][wday][i] = entry.startDateStr != entry.currentDateStr && wday > 0;

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
      for (let i=0, originalIndex=0; i < day.entries.length; i++, originalIndex++) {
        if (removableIndexes[weekIndex][wday][originalIndex]) {
          day.entries.splice(i--, 1);
        }
      }
    });
  });

  return weeks;
}

export { monthLayoutFor };