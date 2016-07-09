(function() {

  window.CallayEngine = function(startDate, sourceEvents, options) {
    if (!options) {
      options = {};
    }

    startDate = moment(startDate); // clone so we don't mess up the original
    var nextId = parseInt(1000 + Math.random()*8000);
    var maxEventsPerDay = options.maxEventsPerDay || 4;
    var weeks = [];
    var month = parseInt(startDate.format('M'));
    var date = startDate.startOf('month');

    forEach(sourceEvents, function(sourceEvent) {
      if (sourceEvent.allDay) {
        sourceEvent.start = moment(sourceEvent.start).startOf('day');
        sourceEvent.end = moment(sourceEvent.start).add(sourceEvent.duration, 'minutes').subtract(1, 'minute').endOf('day');
      } else {
        sourceEvent.end = moment(sourceEvent.start).add(sourceEvent.duration, 'minutes');
      }
    });

    /**
     * generateWeeks
     */
    this.generateWeeks = function() {
      weeks = [];

      var weekNum = 0;
      forEachInterval({
        week: function(startDate) {
          weeks.push({days:[], eventContainers:[]});
          weekNum++;
        },
        day: function(startDate) {
          var week = weeks[weeks.length-1];
          week.days.push({
            eventContainers: [],
            dateStr: startDate.format('YYYY-MM-DD'),
            month: startDate.format('MMM'),
            date: startDate.date(),
            wday: startDate.day(),
            week: weekNum-1,
            hidden: 0
          });
        }
      });

      processEvents();

      return weeks;
    }

    /**
     * PRIVATE processEvents
     */
    function processEvents() {
      var eventContainerMap = {};
      forEach(sourceEvents, function(sourceEvent) {
        var date = moment(sourceEvent.start);
        while (date.isBefore(sourceEvent.end)) {
          var dateStr = date.format('YYYY-MM-DD');
          if (!eventContainerMap[dateStr]) {
            eventContainerMap[dateStr] = [];
          }
          if (!sourceEvent._startDateStr) {
            sourceEvent._startDateStr = dateStr;
            sourceEvent._endDateStr = sourceEvent.end.format('YYYY-MM-DD');
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
          span = Math.min(7-date.day(), span);

          if (!sourceEvent._eventId)
            sourceEvent._eventId = nextId++;

          eventContainerMap[dateStr].push({
            id: sourceEvent._eventId,
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

      forEach(weeks, function(week, weekIndex) {
        forEach(week.days, function(day, wday) {
          day.eventContainers = eventContainerMap[day.dateStr] || [];
          if (!day.eventContainers) return;
          sortByStart(day.eventContainers);
          var usedIndexes = {};
          forEach(day.eventContainers, function(eventContainer) {
            eventContainer.pos.week = weekIndex;
            eventContainer.pos.wday = wday;
            if (!eventContainer.sourceEvent._row) {
              var eventIndex = findNextUnused(usedIndexes);
              eventContainer.sourceEvent._row = eventIndex;
              eventContainer.pos.row = eventIndex;
              usedIndexes[eventIndex] = true;
            } else {
              eventContainer.pos.row = eventContainer.sourceEvent._row;
              usedIndexes[eventContainer.pos.row] = true;
            }

            // Figure out if this is an event that spans multiple days.  If so,
            // add the contiuedFirst and continuedLast properties.  These tell
            // us if this date is the first or last part of a continuation.
            if (eventContainer.sourceEvent._startDateStr != eventContainer.sourceEvent._endDateStr) {
              eventContainer.flags.continued = true;
              if (eventContainer.sourceEvent._startDateStr == eventContainer.dateStr) {
                eventContainer.flags.continuedFirst = true;
              }
              if (eventContainer.sourceEvent._endDateStr == moment(eventContainer.dateStr,'YYYY-MM-DD').add(eventContainer.pos.span-1, 'days').format('YYYY-MM-DD')) {
                eventContainer.flags.continuedLast = true;
              }
              if (!eventContainer.flags.continuedFirst && !eventContainer.flags.continuedLast) {
                eventContainer.flags.continuedMiddle = true;
              }
            }

            // Figure out if we should remove this entry when it's a multi-day
            // event.  We had them in the data set originally to make it easier
            // to calculate subsequent events on each day, but in the final data
            // set we want them removed (spans tell us how to render multi-days).
            eventContainer.flags.remove = !(!eventContainer.flags.continued ||
                                             eventContainer.pos.wday == 0 ||
                                             eventContainer.flags.continuedFirst);

            week.eventContainers.push(eventContainer);
          });
        });
      });

      // Now loop through and remove the duplicates for multi-day events.  We had
      // them in the dataset initially so we can easily calculate the position
      // on each day.  But in the return value, we want them removed.
      forEach(weeks, function(week, weekIndex) {
        forEach(week.days, function(day) {
          // If we've hit the max number of events to display for the day,
          // remove all further events.  Also check to see if there are MORE
          // than the max number of events and if so, add a special "more"
          // marker and remove the max-1 event to make room.
          for (var i=0; i < day.eventContainers.length; i++) {
            if (day.eventContainers[i].pos.row >= maxEventsPerDay) {
              day.hidden += 1;
            }
            if (day.eventContainers[i].pos.row >= maxEventsPerDay) {
              day.visibleEvents = maxEventsPerDay;
              day.eventContainers[i].flags.remove = true;
            }
          }

          for (var i=0; i < day.eventContainers.length; i++) {
            if (day.eventContainers[i].flags.remove) {
              day.eventContainers.splice(i--, 1);
            } else {
              delete day.eventContainers[i].flags.remove;
            }
          }

          for (var i=0; i < week.eventContainers.length; i++) {
            if (week.eventContainers[i].flags.remove) {
              week.eventContainers.splice(i--, 1);
            }
          }
        });
      });
    }

    /**
     * PRIVATE
     */
    function forEachInterval(callbacks) {
      date = date.startOf('week');
      while (date.format('M') <= month) {
        if (callbacks.week) {
          callbacks.week(date);
        }
        for (var i=0; i < 7; i++) {
          if (callbacks.day) {
            callbacks.day(date);
          }
          date.add(1, 'day');
        }
      }
    }

    /**
     * PRIVATE
     */
    function forEach(object, callback) {
      if (object instanceof Array) {
        for (var i=0; i < object.length; i++) {
          callback(object[i], i);
        }
      } else if (typeof object == 'object') {
        var keys = Object.keys(object);
        for (var i=0; i < keys.length; i++) {
          callback(object[keys[i]], keys[i]);
        }
      }
    }

    /**
     * PRIVATE
     */
    function sortByStart(eventContainers) {
      eventContainers.sort(function(a, b) {
        if (a.sourceEvent.start.isBefore(b.sourceEvent.start)) return -1;
        if (a.sourceEvent.start.isAfter(b.sourceEvent.start)) return 1;
        return 0;
      });
    }

    /**
     * PRIVATE
     */
    function findNextUnused(indexes) {
      for (var i=0; i < 50; i++) {
        if (!indexes[i]) return i;
      }
      return i;
    }
  };

})();
