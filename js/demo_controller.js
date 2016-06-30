angular.module('CallayDemo', []).controller('DemoController', [
  '$scope',
function(
  $scope
){

  var startDate = moment.tz('2016-06-01', 'YYYY-MM-DD', 'US/Eastern');

  // scope variables
  $scope.weeks = [];
  $scope.title = startDate.format('MMMM, YYYY');

  // scope functions

  init();

  /*********************************************************************/

  function init() {
    var sourceEvents = [];
    sourceEvents.push({start: moment.tz('2016-06-07 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-08', 'YYYY-MM-DD', 'US/Eastern'), duration: 60*24*4, allDay: true});
    sourceEvents.push({start: moment.tz('2016-06-10 15:45', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-28 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-29 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-29 09:45', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-30 08:15', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-07-01 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-07-03 10:25', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 90, allDay: false});
    sourceEvents.push({start: moment.tz('2016-06-01 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*9, allDay: true});
    sourceEvents.push({start: moment.tz('2016-06-28 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*5, allDay: true});
    sourceEvents.push({start: moment.tz('2016-06-29 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*2, allDay: true});
    sourceEvents.push({start: moment.tz('2016-07-02 00:00', 'YYYY-MM-DD HH:mm', 'US/Eastern'), duration: 60*24*3, allDay: true});

    $scope.weeks = new CallayEngine(startDate, sourceEvents).generateWeeks();
  }


}]);
