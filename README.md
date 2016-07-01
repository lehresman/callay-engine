Callay Engine
=============

Callay Engine is a calendar layout engine.  It takes a list of events
and outputs a data structure with hints about how to render those events onto
a calendar UI.

Why create this project?

* Makes it easy to create a fully customized and integrated calendar experience
  in your existing UI.
* Splits out the logic of calendar rendering from the layout engine
* Has minimal requirements (only momentjs)


License
=======

[MIT](https://raw.githubusercontent.com/lehresman/callay-engine/master/LICENSE)


History
=======

This project was created by Luke Ehresman out of frustration.  All the calendar
libraries in JavaScript have lots of dependencies and make lots of assumptions
about how the UI is laid out.  It's difficult to fully integrate these
pre-canned UIs into an existing UI.

It seemed to make more sense to separate the layout engine from the UI
rendering code, and why not just make it a separate stand-alone project so
others can build their own UIs on top?


Example
=======

The output of the Callay engine is a JavaScript object with details on how to
render the calendar.  *There is no UI component to this calendar engine.*
However, for demo purposes, here is an example of how a calendar might be rendered
using the information provided by the Callay engine:

![Example Calendar UI](https://raw.githubusercontent.com/lehresman/callay-engine/master/public/example.png =600x402)

NOTE:  The above image is a demo only.  While the demo is provided in this
repository, the idea is that you will take the object and create your own UI
that integrates into your project.

Here is the object that the Callay engine returns.  Pay close attention to the `pos`
attribute that is generated on the `eventContainer` object.  This tells you where to
position the event on the calendar.

```javascript
[
   {
      "days" : [
         {
            "dateStr" : "2016-05-29",
            "wday" : 0,
            "month" : "May",
            "date" : 29,
            "week" : 0,
            "eventContainers" : []
         },
         /* ... clipped ... */
         {
            "eventContainers" : [],
            "week" : 0,
            "date" : 4,
            "month" : "Jun",
            "wday" : 6,
            "dateStr" : "2016-06-04"
         }
      ],
      "eventContainers" : []
   },
   {
      "days" : [
         {
            "week" : 1,
            "eventContainers" : [],
            "month" : "Jun",
            "wday" : 0,
            "date" : 5,
            "dateStr" : "2016-06-05"
         },
         {
            "wday" : 1,
            "month" : "Jun",
            "date" : 6,
            "week" : 1,
            "eventContainers" : [],
            "dateStr" : "2016-06-06"
         },
         {
            "wday" : 2,
            "month" : "Jun",
            "date" : 7,
            "week" : 1,
            "eventContainers" : [
               {
                  "flags" : {
                     "allDay" : false
                  },
                  "sourceEvent" : {
                     "duration" : 90,
                     "allDay" : false,
                     "start" : "2016-06-07T12:15:00.000Z",
                  },
                  "pos" : {
                     "week" : 1,
                     "wday" : 2,
                     "span" : 1,
                     "row" : 0
                  },
                  "dateStr" : "2016-06-07"
               }
            ],
            "dateStr" : "2016-06-07"
         },
         {
            "month" : "Jun",
            "wday" : 3,
            "date" : 8,
            "week" : 1,
            "eventContainers" : [
               {
                  "sourceEvent" : {
                     "start" : "2016-06-08T04:00:00.000Z",
                     "allDay" : true,
                     "duration" : 5760
                  },
                  "flags" : {
                     "continuedLast" : true,
                     "allDay" : true,
                     "continued" : true,
                     "continuedFirst" : true
                  },
                  "pos" : {
                     "wday" : 3,
                     "week" : 1,
                     "row" : 0,
                     "span" : 4
                  },
                  "dateStr" : "2016-06-08"
               }
            ],
            "dateStr" : "2016-06-08"
         },
         {
            "dateStr" : "2016-06-09",
            "week" : 1,
            "eventContainers" : [],
            "wday" : 4,
            "month" : "Jun",
            "date" : 9
         },
         {
            "eventContainers" : [
               {
                  "flags" : {
                     "allDay" : false
                  },
                  "sourceEvent" : {
                     "duration" : 90,
                     "allDay" : false,
                     "start" : "2016-06-10T19:45:00.000Z",
                  },
                  "pos" : {
                     "row" : 1,
                     "span" : 1,
                     "week" : 1,
                     "wday" : 5
                  },
                  "dateStr" : "2016-06-10"
               }
            ],
            "week" : 1,
            "date" : 10,
            "month" : "Jun",
            "wday" : 5,
            "dateStr" : "2016-06-10"
         },
         {
            "eventContainers" : [],
            "week" : 1,
            "date" : 11,
            "month" : "Jun",
            "wday" : 6,
            "dateStr" : "2016-06-11"
         }
      ],
      "eventContainers" : [
         {
            "pos" : {
               "span" : 1,
               "row" : 0,
               "wday" : 2,
               "week" : 1
            },
            "dateStr" : "2016-06-07",
            "sourceEvent" : {
               "duration" : 90,
               "allDay" : false,
               "start" : "2016-06-07T12:15:00.000Z",
            },
            "flags" : {
               "allDay" : false
            }
         },
         {
            "dateStr" : "2016-06-08",
            "pos" : {
               "span" : 4,
               "row" : 0,
               "week" : 1,
               "wday" : 3
            },
            "sourceEvent" : {
               "start" : "2016-06-08T04:00:00.000Z",
               "duration" : 5760,
               "allDay" : true
            },
            "flags" : {
               "continuedLast" : true,
               "continued" : true,
               "allDay" : true,
               "continuedFirst" : true
            }
         },
         {
            "pos" : {
               "week" : 1,
               "wday" : 5,
               "span" : 1,
               "row" : 1
            },
            "dateStr" : "2016-06-10",
            "sourceEvent" : {
               "allDay" : false,
               "duration" : 90,
               "start" : "2016-06-10T19:45:00.000Z"
            },
            "flags" : {
               "allDay" : false
            }
         }
      ]
   },
   /* ... clipped ... */
]
```
