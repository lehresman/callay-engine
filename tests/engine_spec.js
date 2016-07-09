describe("Callay Test Suite", function() {
  var startDate = moment.tz('2016-06-01', 'YYYY-MM-DD', 'Europe/Berlin');
  function createEvent(startTime, duration, timezone, allDay) {
    return {
      start: moment.tz(startTime, 'YYYY-MM-DD HH:mm', (timezone || 'Europe/Berlin')),
      duration: duration || 60,
      allDay: allDay || false
    };
  }

  it("has a valid day and week structure", function() {
    var weeks = new CallayEngine(startDate, []).generateWeeks();

    // Make sure all the weeks are there to cover the entire month's dates
    expect(weeks.length).toEqual(5);

    // Make sure each week has the full seven days
    for (var i=0; i < weeks.length; i++) {
      var week = weeks[i];
      expect(week.days.length).toEqual(7);
    }

    // Spot-check the dates to make sure they span the three month period
    expect(weeks[0].days[1].date).toEqual(30); // May 30, 2016
    expect(weeks[0].days[3].date).toEqual(1);  // June 1, 2016
    expect(weeks[4].days[0].date).toEqual(26); // June 26, 2016
    expect(weeks[4].days[6].date).toEqual(2);  // July 2, 2016

    // Spot-check the dates to make sure they have dateStr set properly
    expect(weeks[0].days[1].dateStr).toEqual('2016-05-30');
    expect(weeks[0].days[3].dateStr).toEqual('2016-06-01');
    expect(weeks[4].days[0].dateStr).toEqual('2016-06-26');
    expect(weeks[4].days[6].dateStr).toEqual('2016-07-02');

    // Spot-check the dates to make sure they set the weekday properly
    expect(weeks[0].days[1].wday).toEqual(1);
    expect(weeks[0].days[3].wday).toEqual(3);
    expect(weeks[4].days[0].wday).toEqual(0);
    expect(weeks[4].days[6].wday).toEqual(6);

    // Spot-check the dates to make sure they set the month properly
    expect(weeks[0].days[1].month).toEqual('May');
    expect(weeks[0].days[3].month).toEqual('Jun');
    expect(weeks[4].days[0].month).toEqual('Jun');
    expect(weeks[4].days[6].month).toEqual('Jul');

    // Spot-check the dates to make sure they set the week properly
    expect(weeks[0].days[1].week).toEqual(0);
    expect(weeks[0].days[3].week).toEqual(0);
    expect(weeks[4].days[0].week).toEqual(4);
    expect(weeks[4].days[6].week).toEqual(4);
  });

  it("positions an event properly", function() {
    var sourceEvents = [createEvent('2016-06-01 08:15')];
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();
    expect(weeks[0].eventContainers.length).toEqual(1);
    expect(weeks[0].eventContainers[0].dateStr).toEqual('2016-06-01');
    expect(weeks[0].eventContainers[0].flags.allDay).toEqual(false);
    expect(weeks[0].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[0].eventContainers[0].pos.span).toEqual(1);
    expect(weeks[0].eventContainers[0].pos.wday).toEqual(3);
  });

  it("spans an all-day event across two dates", function() {
    var event = createEvent('2016-06-01 00:00', 60*24*2);
    event.allDay = true;
    var sourceEvents = [event];
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();
    expect(weeks[0].eventContainers.length).toEqual(1);
    expect(weeks[0].eventContainers[0].dateStr).toEqual('2016-06-01');
    expect(weeks[0].eventContainers[0].flags.allDay).toEqual(true);
    expect(weeks[0].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[0].eventContainers[0].pos.span).toEqual(2);
    expect(weeks[0].eventContainers[0].pos.wday).toEqual(3);
  });

  it("spans an event across two weeks", function() {
    var event = createEvent('2016-06-01 00:00', 60*24*9);
    event.allDay = true;
    var sourceEvents = [event];
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();
    // The first part of the event is on the first week
    expect(weeks[0].eventContainers.length).toEqual(1);
    expect(weeks[0].eventContainers[0].dateStr).toEqual('2016-06-01');
    expect(weeks[0].eventContainers[0].flags.allDay).toEqual(true);
    expect(weeks[0].eventContainers[0].flags.continued).toEqual(true);
    expect(weeks[0].eventContainers[0].flags.continuedFirst).toEqual(true);
    expect(weeks[0].eventContainers[0].flags.continuedMiddle).toEqual(undefined);
    expect(weeks[0].eventContainers[0].flags.continuedLast).toEqual(undefined);
    expect(weeks[0].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[0].eventContainers[0].pos.week).toEqual(0);
    expect(weeks[0].eventContainers[0].pos.span).toEqual(4);
    expect(weeks[0].eventContainers[0].pos.wday).toEqual(3);
    // The last part of the event is on the second week
    expect(weeks[1].eventContainers.length).toEqual(1);
    expect(weeks[1].eventContainers[0].dateStr).toEqual('2016-06-05');
    expect(weeks[1].eventContainers[0].flags.allDay).toEqual(true);
    expect(weeks[1].eventContainers[0].flags.continued).toEqual(true);
    expect(weeks[1].eventContainers[0].flags.continuedFirst).toEqual(undefined);
    expect(weeks[1].eventContainers[0].flags.continuedMiddle).toEqual(undefined);
    expect(weeks[1].eventContainers[0].flags.continuedLast).toEqual(true);
    expect(weeks[1].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[1].eventContainers[0].pos.week).toEqual(1);
    expect(weeks[1].eventContainers[0].pos.span).toEqual(5);
    expect(weeks[1].eventContainers[0].pos.wday).toEqual(0);
  });

  it("spans an event across three weeks", function() {
    var sourceEvents = [createEvent('2016-06-01 00:00', 60*24*15, null, true)];
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();
    // The first part of the event is on the first week
    expect(weeks[0].eventContainers.length).toEqual(1);
    expect(weeks[0].eventContainers[0].dateStr).toEqual('2016-06-01');
    expect(weeks[0].eventContainers[0].flags.continued).toEqual(true);
    expect(weeks[0].eventContainers[0].flags.continuedFirst).toEqual(true);
    expect(weeks[0].eventContainers[0].flags.continuedMiddle).toEqual(undefined);
    expect(weeks[0].eventContainers[0].flags.continuedLast).toEqual(undefined);
    // The middle part of the event is on the second week
    expect(weeks[1].eventContainers.length).toEqual(1);
    expect(weeks[1].eventContainers[0].dateStr).toEqual('2016-06-05');
    expect(weeks[1].eventContainers[0].flags.continued).toEqual(true);
    expect(weeks[1].eventContainers[0].flags.continuedFirst).toEqual(undefined);
    expect(weeks[1].eventContainers[0].flags.continuedMiddle).toEqual(true);
    expect(weeks[1].eventContainers[0].flags.continuedLast).toEqual(undefined);
    // The last part of the event is on the third week
    expect(weeks[2].eventContainers.length).toEqual(1);
    expect(weeks[2].eventContainers[0].dateStr).toEqual('2016-06-12');
    expect(weeks[2].eventContainers[0].flags.continued).toEqual(true);
    expect(weeks[2].eventContainers[0].flags.continuedFirst).toEqual(undefined);
    expect(weeks[2].eventContainers[0].flags.continuedMiddle).toEqual(undefined);
    expect(weeks[2].eventContainers[0].flags.continuedLast).toEqual(true);
    expect(weeks[2].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[2].eventContainers[0].pos.week).toEqual(2);
    expect(weeks[2].eventContainers[0].pos.span).toEqual(4);
    expect(weeks[2].eventContainers[0].pos.wday).toEqual(0);
  });

  it("positions an event properly when a previous all-day event is on the second row", function() {
    var sourceEvents = [
      createEvent('2016-06-07 08:15', 60, 'US/Eastern'),
      createEvent('2016-06-08 00:00', 60*24*4, 'US/Eastern', true),
      createEvent('2016-06-10 15:45', 90, 'US/Eastern'),
      createEvent('2016-06-01 00:00', 60*24*9, 'US/Eastern', true)
    ];
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();

    // The two single-day events should be positioned around the spanning all-day events
    expect(weeks[1].days[5].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[1].days[2].eventContainers[0].pos.row).toEqual(1);
  });

  it('handles spanning events on second row followed by two new events', function() {
    var sourceEvents = [];
    sourceEvents.push(createEvent('2016-05-30 00:00', 60*24*5, 'US/Eastern', true));
    sourceEvents.push(createEvent('2016-06-01 00:00', 60*24*2, 'US/Eastern', true));
    sourceEvents.push(createEvent('2016-05-28 00:00', 60*24*3, 'US/Eastern', true));
    sourceEvents.push(createEvent('2016-06-02 09:45', 60*24, 'US/Eastern', true));
    var weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();

    // There was a bug where two events could overlap if a spanning event on the
    // second row was followed the next day by two new events.  The second event
    // would overlap the spanning event on the 2nd row.
    expect(weeks[0].days[0].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[0].days[1].eventContainers[0].pos.row).toEqual(1);
    expect(weeks[0].days[3].eventContainers[0].pos.row).toEqual(0);
    expect(weeks[0].days[4].eventContainers[0].pos.row).toEqual(2);
  });

  it('works when spanning year boundary', function() {
    var startDate = moment.tz('2016-01-15', 'YYYY-MM-DD', 'Europe/Berlin');
    var weeks = new CallayEngine(startDate, []).generateWeeks();
    expect(weeks.length).toEqual(6);

    var startDate = moment.tz('2016-12-15', 'YYYY-MM-DD', 'Europe/Berlin');
    var weeks = new CallayEngine(startDate, []).generateWeeks();
    expect(weeks.length).toEqual(5);
  });
});
