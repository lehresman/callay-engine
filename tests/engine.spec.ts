import * as moment from 'moment-timezone';
import { dayLayoutFor, monthLayoutFor } from "../src/callay_engine";
import * as uuid from 'uuid';

class TestEvent {
  id: string;
  start: moment.Moment;
  duration: number;
  isAllDay?: boolean;

  constructor(attrs: any) {
    this.id = uuid();
    this.start = moment.tz(attrs.start, attrs.timezone || 'Europe/Berlin');
    this.duration = attrs.duration;
    this.isAllDay = attrs.isAllDay || false;
  }
}

function createEvent(attrs: {
  id: string | number,
  start: string,
  duration: number,
  timezone?: string,
  allDay?: boolean,
}) {
  let tz = attrs.timezone || 'US/Pacific';
  return {
    id: attrs.id,
    start: moment.tz(attrs.start, 'YYYY-MM-DD HH:mm', tz),
    duration: attrs.duration || 60,
  };
}

describe('monthLayoutFor', () => {
  let tz = 'Europe/Berlin';
  let startDate = moment.tz('2018-01-01 00:00', tz);
  let endDate = moment.tz('2018-01-15 00:00', tz);

  it('should properly position a single event', () => {
    let events: TestEvent[] = [new TestEvent({start: '2018-01-01 08:00', duration: 60})];
    let weeks = monthLayoutFor(startDate, endDate, events);

    expect(weeks.length).toBe(3);
    expect(weeks[0].days[1].dateStr).toBe('2018-01-01');
    expect(weeks[0].days[1].entries.length).toBe(1);
    expect(weeks[0].days[1].entries[0].isStart).toBe(true);
    expect(weeks[0].days[1].entries[0].isEnd).toBe(true);
  });

  it('should properly position the levels for multiple events', () => {
    let events: TestEvent[] = [
      new TestEvent({start: '2018-01-02 14:00', duration: 60}), // will not be added to 2018-01-01
      new TestEvent({start: '2018-01-01 10:15', duration: 60}),
      new TestEvent({start: '2018-01-01 08:00', duration: 60}),
    ];
    let weeks = monthLayoutFor(startDate, endDate, events);
    expect(weeks[0].days[1].entries.length).toBe(2);
    expect(weeks[0].days[1].entries[0].originalEvent.start.hours()).toBe(8);
    expect(weeks[0].days[1].entries[0].level).toBe(0);
    expect(weeks[0].days[1].entries[1].originalEvent.start.hours()).toBe(10);
    expect(weeks[0].days[1].entries[1].level).toBe(1);
  });

  it('should properly calculate spanning events in the same week', () => {
    let firstEvent = new TestEvent({start: '2018-01-02 14:00', duration: 60});
    let secondEvent = new TestEvent({start: '2018-01-01 10:15', duration: 60*48});
    let thirdEvent = new TestEvent({start: '2018-01-01 08:00', duration: 60});
    let fourthEvent = new TestEvent({start: '2018-01-03 08:00', duration: 30});
    let fifthEvent = new TestEvent({start: '2018-01-03 09:00', duration: 30});
    let events: TestEvent[] = [firstEvent, secondEvent, thirdEvent, fourthEvent, fifthEvent];
    let weeks = monthLayoutFor(startDate, endDate, events);

    // 2018-01-01
    expect(weeks[0].days[1].entries.length).toBe(2);

    expect(weeks[0].days[1].entries[0].id).toBe(thirdEvent.id);
    expect(weeks[0].days[1].entries[0].isStart).toBe(true);
    expect(weeks[0].days[1].entries[0].isEnd).toBe(true);
    expect(weeks[0].days[1].entries[0].level).toBe(0);
    expect(weeks[0].days[1].entries[0].span).toBe(1);

    expect(weeks[0].days[1].entries[1].id).toBe(secondEvent.id);
    expect(weeks[0].days[1].entries[1].isStart).toBe(true);
    expect(weeks[0].days[1].entries[1].isEnd).toBe(true);
    expect(weeks[0].days[1].entries[1].level).toBe(1);
    expect(weeks[0].days[1].entries[1].span).toBe(3);

    // 2018-01-02
    expect(weeks[0].days[2].entries.length).toBe(1);

    expect(weeks[0].days[2].entries[0].id).toBe(firstEvent.id);
    expect(weeks[0].days[2].entries[0].level).toBe(0);
    expect(weeks[0].days[2].entries[0].span).toBe(1);

    // 2018-01-03
    expect(weeks[0].days[3].entries.length).toBe(2);

    expect(weeks[0].days[3].entries[0].id).toBe(fourthEvent.id);
    expect(weeks[0].days[3].entries[0].level).toBe(0);
    expect(weeks[0].days[3].entries[0].span).toBe(1);

    expect(weeks[0].days[3].entries[1].id).toBe(fifthEvent.id);
    expect(weeks[0].days[3].entries[1].level).toBe(2);
    expect(weeks[0].days[3].entries[1].span).toBe(1);
  });

  it('should properly span multi-day events across two weeks', () => {
    let longEvent = new TestEvent({start: '2018-01-06 10:15', duration: 60*24*4});
    let events: TestEvent[] = [
      new TestEvent({start: '2018-01-06 09:00', duration: 30}),
      longEvent,
      new TestEvent({start: '2018-01-07 09:00', duration: 30}),
    ];
    let weeks = monthLayoutFor(startDate, endDate, events);

    // 2018-01-06 (Saturday)
    expect(weeks[0].days[6].entries.length).toBe(2);
    expect(weeks[0].days[6].entries[0].id).not.toBe(longEvent.id);
    expect(weeks[0].days[6].entries[1].id).toBe(longEvent.id);
    expect(weeks[0].days[6].entries[1].span).toBe(1); // 1 because only 1 day left this week
    expect(weeks[0].days[6].entries[1].isStart).toBe(true);
    expect(weeks[0].days[6].entries[1].isEnd).toBe(false);

    // 2018-01-07 (Sunday)
    expect(weeks[1].days[0].entries.length).toBe(2);
    expect(weeks[1].days[0].entries[0].id).not.toBe(longEvent.id);
    expect(weeks[1].days[0].entries[1].id).toBe(longEvent.id);
    expect(weeks[1].days[0].entries[1].span).toBe(4);
    expect(weeks[1].days[0].entries[1].isStart).toBe(false);
    expect(weeks[1].days[0].entries[1].isEnd).toBe(true);

    // 2018-01-09 (Tuesday)
    // Even though longEvent spans through Tuesday, the entry is added
    // on Sunday with a span that extends it through Tuesday.
    expect(weeks[1].days[2].entries.length).toBe(0);
  });

  it('should properly span multi-day events across three weeks', () => {
    let longEvent = new TestEvent({start: '2018-01-06 10:15', duration: 60*24*10});
    let events: TestEvent[] = [longEvent];
    let weeks = monthLayoutFor(startDate, endDate, events);

    // 2018-01-06 (Saturday)
    expect(weeks[0].days[6].entries[0].span).toBe(1); // 1 because only 1 day left this week
    expect(weeks[0].days[6].entries[0].isStart).toBe(true);
    expect(weeks[0].days[6].entries[0].isEnd).toBe(false);

    // 2018-01-07 (Sunday)
    expect(weeks[1].days[0].entries[0].span).toBe(7);
    expect(weeks[1].days[0].entries[0].isStart).toBe(false);
    expect(weeks[1].days[0].entries[0].isEnd).toBe(false);

    // 2018-01-14 (Sunday)
    expect(weeks[2].days[0].entries[0].span).toBe(3);
    expect(weeks[2].days[0].entries[0].isStart).toBe(false);
    expect(weeks[2].days[0].entries[0].isEnd).toBe(true);

  });

  it('should cut off after endDate, even if other events exist', () => {
    let events: TestEvent[] = [
      new TestEvent({start: '2018-01-06 09:00', duration: 60*24*365*200}), // 200 years to test performance
      new TestEvent({start: '2018-12-31 09:00', duration: 30}),
    ];
    let weeks = monthLayoutFor(startDate, endDate, events);
    expect(weeks.length).toBe(3);
  });

  it('handles 24-hour events', () => {
    let event = new TestEvent({start: '2018-01-01 00:00', duration: 60*24, isAllDay: true});
    let weeks = monthLayoutFor(startDate, endDate, [event]);
    expect(weeks[0].days[1].entries[0].span).toBe(1);
    expect(weeks[0].days[1].entries[0].startDateStr).toBe('2018-01-01');
    expect(weeks[0].days[1].entries[0].endDateStr).toBe('2018-01-01');
  });

  it('handles event that barely span midnight', () => {
    let event = new TestEvent({start: '2018-01-01 23:30', duration: 60});
    let weeks = monthLayoutFor(startDate, endDate, [event]);
    expect(weeks[0].days[1].entries[0].span).toBe(2);
    expect(weeks[0].days[1].entries[0].startDateStr).toBe('2018-01-01');
    expect(weeks[0].days[1].entries[0].endDateStr).toBe('2018-01-02');
    expect(weeks[0].days[1].entries[0].isStart).toBe(true);
    expect(weeks[0].days[1].entries[0].isEnd).toBe(true);
  });
});

describe('dayLayoutFor', () => {
  let tz = 'Europe/Berlin';
  let startDate = moment.tz('2018-01-01 00:00', tz);
  let endDate = moment.tz('2018-01-04 23:59', tz);

  it('should categorizes events into the correct day slots', () => {
    let events: TestEvent[] = [
      new TestEvent({start: '2018-01-01 08:00', duration: 60}),
      new TestEvent({start: '2018-01-01 10:00', duration: 60}),
      new TestEvent({start: '2018-01-02 08:00', duration: 60}),
      new TestEvent({start: '2018-01-05 08:00', duration: 60}),
    ];
    let days = dayLayoutFor(startDate, endDate, events);

    expect(days.length).toBe(4);
    expect(days[0].dateStr).toBe('2018-01-01');
    expect(days[0].entries.length).toBe(2);
    expect(days[1].entries.length).toBe(1);
    expect(days[2].entries.length).toBe(0);
    expect(days[3].entries.length).toBe(0);
  });

  it('should properly mark events that span multiple days', () => {
    let events: TestEvent[] = [
      new TestEvent({start: '2017-12-31 00:00', duration: 60*24*3}),
      new TestEvent({start: '2018-01-01 23:00', duration: 60}),
      new TestEvent({start: '2018-01-02 23:00', duration: 120}),
    ];
    let days = dayLayoutFor(startDate, endDate, events);

    expect(days[0].entries.length).toBe(2);
    expect(days[0].entries[0].isStart).toBeFalsy();
    expect(days[0].entries[0].isEnd).toBeFalsy();
    expect(days[0].entries[1].isStart).toBeTruthy();
    expect(days[0].entries[1].isEnd).toBeTruthy();

    expect(days[1].entries.length).toBe(2);
    expect(days[1].entries[0].isStart).toBeFalsy();
    expect(days[1].entries[0].isEnd).toBeTruthy();
    expect(days[1].entries[1].isStart).toBeTruthy();
    expect(days[1].entries[1].isEnd).toBeFalsy();
  });

  it('should layer overlapping events properly', () => {
    let events: TestEvent[] = [
      new TestEvent({start: '2018-01-01 08:00', duration: 60}),
      new TestEvent({start: '2018-01-01 08:30', duration: 60}),
      new TestEvent({start: '2018-01-01 09:00', duration: 120}),
      new TestEvent({start: '2018-01-01 09:30', duration: 60}),
      new TestEvent({start: '2018-01-01 10:29', duration: 60}),
      new TestEvent({start: '2018-01-01 11:15', duration: 60}),
      new TestEvent({start: '2018-01-01 15:00', duration: 30}),

      new TestEvent({start: '2018-01-02 08:00', duration: 120}),
      new TestEvent({start: '2018-01-02 08:30', duration: 120}),
      new TestEvent({start: '2018-01-02 09:00', duration: 120}),
      new TestEvent({start: '2018-01-02 09:30', duration: 120}),
      new TestEvent({start: '2018-01-02 10:00', duration: 120}),

      new TestEvent({start: '2018-01-03 08:00', duration: 240}),
      new TestEvent({start: '2018-01-03 08:30', duration: 90}),
      new TestEvent({start: '2018-01-03 09:00', duration: 60}),
      new TestEvent({start: '2018-01-03 09:30', duration: 30}),
      new TestEvent({start: '2018-01-03 10:00', duration: 90}),
      new TestEvent({start: '2018-01-03 10:30', duration: 60}),
    ];
    let days = dayLayoutFor(startDate, endDate, events);

    expect(days[0].entries[0].level).toEqual(0);
    expect(days[0].entries[1].level).toEqual(1);
    expect(days[0].entries[2].level).toEqual(0);
    expect(days[0].entries[3].level).toEqual(1);
    expect(days[0].entries[4].level).toEqual(2);
    expect(days[0].entries[5].level).toEqual(0);
    expect(days[0].entries[6].level).toEqual(0);
    expect(days[0].entries[0].maxLevel).toEqual(1);
    expect(days[0].entries[1].maxLevel).toEqual(1);
    expect(days[0].entries[2].maxLevel).toEqual(2);
    expect(days[0].entries[3].maxLevel).toEqual(2);
    expect(days[0].entries[4].maxLevel).toEqual(2);
    expect(days[0].entries[5].maxLevel).toEqual(2);
    expect(days[0].entries[6].maxLevel).toEqual(0);

    expect(days[1].entries[0].level).toEqual(0);
    expect(days[1].entries[1].level).toEqual(1);
    expect(days[1].entries[2].level).toEqual(2);
    expect(days[1].entries[3].level).toEqual(3);
    expect(days[1].entries[4].level).toEqual(0);
    expect(days[1].entries[0].maxLevel).toEqual(3);
    expect(days[1].entries[1].maxLevel).toEqual(3);
    expect(days[1].entries[2].maxLevel).toEqual(3);
    expect(days[1].entries[3].maxLevel).toEqual(3);
    expect(days[1].entries[4].maxLevel).toEqual(3);

    expect(days[2].entries[0].level).toEqual(0);
    expect(days[2].entries[1].level).toEqual(1);
    expect(days[2].entries[2].level).toEqual(2);
    expect(days[2].entries[3].level).toEqual(3);
    expect(days[2].entries[4].level).toEqual(1);
    expect(days[2].entries[5].level).toEqual(2);
    expect(days[2].entries[0].maxLevel).toEqual(3);
    expect(days[2].entries[1].maxLevel).toEqual(3);
    expect(days[2].entries[2].maxLevel).toEqual(3);
    expect(days[2].entries[3].maxLevel).toEqual(3);
    expect(days[2].entries[4].maxLevel).toEqual(2);
    expect(days[2].entries[5].maxLevel).toEqual(2);
  });

});