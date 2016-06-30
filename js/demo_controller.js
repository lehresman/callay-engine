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
    var events = [];
    events.push({start: moment('2016-06-09 08:15', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-27 08:15', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-28 08:15', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-29 10:25', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-29 09:45', 'YYYY-MM-DD HH:mm'), duration: 60*24, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-30 08:15', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-07-01 10:25', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-07-03 10:25', 'YYYY-MM-DD HH:mm'), duration: 90, kind: 'appointment', allDay: false});
    events.push({start: moment('2016-06-02 00:00', 'YYYY-MM-DD HH:mm'), duration: 60*24*12, kind: 'appointment', allDay: true});
    events.push({start: moment('2016-06-28 00:00', 'YYYY-MM-DD HH:mm'), duration: 60*24*5, kind: 'appointment', allDay: true});
    events.push({start: moment('2016-06-29 00:00', 'YYYY-MM-DD HH:mm'), duration: 60*24*2, kind: 'appointment', allDay: true});
    events.push({start: moment('2016-07-02 00:00', 'YYYY-MM-DD HH:mm'), duration: 60*24*3, kind: 'appointment', allDay: true});

    angular.forEach(events, function(event) {
      event.end = moment(event.start).add(event.duration, 'minutes').subtract(1, 'minute');
    });

    calculateWeeks();
    processEvents(events);
  }

  /**
   * calculateWeeks
   */
  function calculateWeeks(eventMap) {
    $scope.weeks = [];
    $scope.days = [];
    $scope.title = date.format('MMMM, YYYY');

    var line = 0;
    forEachInterval({
      week: function(startDate) {
        $scope.weeks.push({days: [], events: []});
        line++;
      },
      day: function(startDate) {
        var week = $scope.weeks[$scope.weeks.length-1];
        week.days.push({
          dateStr: startDate.format('YYYY-MM-DD'),
          month: startDate.format('MMM'),
          date: startDate.format('D'),
          line: line-1,
          wday: startDate.format('d'),
          events: []
        });
      }
    });
  }

  /**
   * processEvents
   */
  function processEvents(events, eventMap) {
    var eventMap = {};
    angular.forEach(events, function(event) {
      var date = moment(event.start);
      while (date <= event.end) {
        var dateStr = date.format('YYYY-MM-DD');
        if (!eventMap[dateStr]) {
          eventMap[dateStr] = [];
        }
        if (!event.startDateStr) {
          event.startDateStr = dateStr;
          event.endDateStr = event.end.format('YYYY-MM-DD');
        }
        eventMap[dateStr].push({
          event: event,
          continued: false,
          dateStr: dateStr,
          allDay: event.allDay,
          week: 0,
          wday: 0,
          row: 0,
          span: 1
        });
        date = date.add(1, 'day');
      }
    });

    angular.forEach($scope.weeks, function(week, weekIndex) {
      angular.forEach(week.days, function(day, wday) {
        day.events = eventMap[day.dateStr];
        if (!day.events) return;
        day.events.sort(function(a, b) {
          if (a.event.start.isBefore(b.event.start)) return -1;
          if (a.event.start.isAfter(b.event.start)) return 1;
          return 0;
        });
        var eventIndex = 0;
        angular.forEach(day.events, function(event) {
          event.span = 1;
          event.week = weekIndex;
          event.wday = wday;
          if (!event.event.row) {
            event.event.row = eventIndex;
            event.row = eventIndex;
            eventIndex += 1;
          } else {
            event.row = event.event.row;
            if (event.row <= eventIndex)
              eventIndex = event.event.row + 1;
          }

          // Figure out if this is an event that spans multiple days.  If so,
          // add the contiuedFirst and continuedLast properties.  These tell
          // us if this date is the first or last part of a continuation.
          if (event.event.startDateStr != event.event.endDateStr) {
            event.continued = true;
            if (event.event.startDateStr == event.dateStr) {
              event.continuedFirst = true;
            }
            if (event.event.endDateStr == event.dateStr) {
              event.continuedLast = true;
            }
            if (!event.continuedFirst && !event.continuedLast) {
              event.continuedMiddle = true;
            }
          }

          // Figure out if the label should be shown for this event or not.
          // We cache this value so the template doesn't have to figure it out.
          event.showLabel = !event.continued || event.wday == 0 || event.continuedFirst;

          week.events.push(event);
        });
      });
    });
    console.log($scope.weeks);
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
