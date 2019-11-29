# Yet Another Pomodoro

## Mission statement (initial commit)

Problem to solve:

A productivity pomodoro application that will block messenger apps on MY setup.

Specifically in my case it's enough to block access to one workspace (nr 2) on my [i3 setup](https://github.com/tarnas14/dotfil3s/blob/master/i3/config).

So, an application should allow this:

- a settings file (sensible default would be ~/.tarnas-pomodoro)
- a persistence file (sensible default would be ~/.tarnas-pomodoro.storage)
- standard options to manage productivity time, short and long breaks (default 25/5/15)
- start pomodoro
- stop pomodoro
- next period
- ask for current state (whether we are in pomodoro or not, what type of period we are in, how long till end)

the last affordance is the most critical one!

output should be plaintext, that could be easily managed by bash scripts

### why:
- it will be used to write a polybar script that will be polling for the pomodoro state every N seconds
- it will be used to decide if the user should be allowed to run a specific shell command e.g. `tarnas-pomodoro state | not-in-pomodoro && i3-msg workspace 2`

in the pseudo-snippet above, `not-in-pomodoro` is the simplest possible check we can find to decide if the next command should be executed

so if the output is `POMODORO 18:13` or `SHORT-BREAK 4:23` or `LONG-BREAK 11:22` you can have
```
[[ $(tarnas-pomodoro state) != POMODORO* ]] && i3-msg workspace 2
```

^ the above will probably be the interface we go with

### very optionally
some history for statistics or some shit
