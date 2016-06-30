angular.module('CallayDemo', []).controller('DemoController', [
  '$scope',
function(
  $scope
){

  var startDate = moment('2016-06-01', 'YYYY-MM-DD');
  var month = parseInt(startDate.format('M'));
  var date = startDate.startOf('month');

  // scope variables
  $scope.weeks = [];

  // scope functions

  init();

  /*********************************************************************/

  function init() {
    var sourceEvents = [];
    sourceEvents.push({start: moment.tz('2016-06-09 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-27 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-28 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-29 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-29 09:45', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-30 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-07-01 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-07-03 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, kind: 'appointment', allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-02 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*12, kind: 'appointment', allDay: true});
    sourceEvents.push({start: moment.tz('2016-06-28 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*5, kind: 'appointment', allDay: true});
    sourceEvents.push({start: moment.tz('2016-06-29 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*2, kind: 'appointment', allDay: true});
    sourceEvents.push({start: moment.tz('2016-07-02 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*3, kind: 'appointment', allDay: true});

    angular.forEach(sourceEvents, function(sourceEvent) {
      if (sourceEvent.allDay) {
        sourceEvent.start = moment(sourceEvent.start).startOf('day');
        sourceEvent.end = moment(sourceEvent.start).add(sourceEvent.duration, 'minutes').subtract(1, 'minute').endOf('day');
      } else {
        sourceEvent.end = moment(sourceEvent.start).add(sourceEvent.duration, 'minutes');
      }
    });

    calculateWeeks();
    processEvents(sourceEvents);
  }

  /**
   * calculateWeeks
   */
  function calculateWeeks() {
    $scope.weeks = [];
    $scope.title = date.format('MMMM, YYYY');

    var line = 0;
    forEachInterval({
      week: function(startDate) {
        $scope.weeks.push({days:[], eventContainers:[]});
        line++;
      },
      day: function(startDate) {
        var week = $scope.weeks[$scope.weeks.length-1];
        week.days.push({
          eventContainers: [],
          dateStr: startDate.format('YYYY-MM-DD'),
          month: startDate.format('MMM'),
          date: startDate.format('D'),
          wday: startDate.format('d'),
          line: line-1
        });
      }
    });
  }

  /**
   * processEvents
   */
  function processEvents(sourceEvents) {
    var eventContainerMap = {};
    angular.forEach(sourceEvents, function(sourceEvent) {
      var date = moment(sourceEvent.start);
      while (date.isBefore(sourceEvent.end)) {
        var dateStr = date.format('YYYY-MM-DD');
        if (!eventContainerMap[dateStr]) {
          eventContainerMap[dateStr] = [];
        }
        if (!sourceEvent.startDateStr) {
          sourceEvent.startDateStr = dateStr;
          sourceEvent.endDateStr = sourceEvent.end.format('YYYY-MM-DD');
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
        var span = 1 + Math.floor(sourceEvent.end.diff(date, 'hours')/24);
        span = Math.min(7-date.day()+1, span);

        eventContainerMap[dateStr].push({
          dateStr: dateStr,
          sourceEvent: sourceEvent,
          flags: {
            allDay: sourceEvent.allDay
          },
          pos: {
            week: 0,
            wday: 0,
            row: 0,
            span: span
          }
        });
        date = date.add(1, 'day').startOf('day');
      }
    });

    angular.forEach($scope.weeks, function(week, weekIndex) {
      angular.forEach(week.days, function(day, wday) {
        day.eventContainers = eventContainerMap[day.dateStr];
        if (!day.eventContainers) return;
        day.eventContainers.sort(function(a, b) {
          if (a.sourceEvent.start.isBefore(b.sourceEvent.start)) return -1;
          if (a.sourceEvent.start.isAfter(b.sourceEvent.start)) return 1;
          return 0;
        });
        var eventIndex = 0;
        angular.forEach(day.eventContainers, function(eventContainer) {
          eventContainer.pos.week = weekIndex;
          eventContainer.pos.wday = wday;
          if (!eventContainer.sourceEvent._row) {
            eventContainer.sourceEvent._row = eventIndex;
            eventContainer.pos.row = eventIndex;
            eventIndex += 1;
          } else {
            eventContainer.pos.row = eventContainer.sourceEvent._row;
            if (eventContainer.pos.row <= eventIndex)
              eventIndex = eventContainer.sourceEvent._row + 1;
          }

          // Figure out if this is an event that spans multiple days.  If so,
          // add the contiuedFirst and continuedLast properties.  These tell
          // us if this date is the first or last part of a continuation.
          if (eventContainer.sourceEvent.startDateStr != eventContainer.sourceEvent.endDateStr) {
            eventContainer.flags.continued = true;
            if (eventContainer.sourceEvent.startDateStr == eventContainer.dateStr) {
              eventContainer.flags.continuedFirst = true;
            }
            if (eventContainer.sourceEvent.endDateStr == eventContainer.dateStr) {
              eventContainer.flags.continuedLast = true;
            }
            if (!eventContainer.flags.continuedFirst && !eventContainer.flags.continuedLast) {
              eventContainer.flags.continuedMiddle = true;
            }
          }

          // Figure out if the label should be shown for this event or not.
          // We cache this value so the template doesn't have to figure it out.
          eventContainer.flags.showLabel = !eventContainer.flags.continued ||
                                            eventContainer.pos.wday == 0 ||
                                            eventContainer.flags.continuedFirst;

          week.eventContainers.push(eventContainer);
        });
      });
    });
  }

  function forEachInterval(callbacks) {
    date = date.startOf('week');
    while (date.format('M') <= month) {
      if (callbacks.week) {
        callbacks.week(date);
      }
      for (var i=0; i < 7; i++) {
        date.add(1, 'day');
        if (callbacks.day) {
          callbacks.day(date);
        }
      }
    }
  }

}]);
