# Yet Another Pomodoro - nodejs

## installation

```
npm i -g yet-another-pomodoro
```

## usage

please see `yap -h`

## big performance problem

although this app works as is described below (and I used it in my i3 configuration), it is not advisable to use it like this, tbh.

### why?

node takes hell of a long time to start and run our script. so even when the script runs immediately, spinning up the node process takes time.

this is ok for scripts, but not for something that is bound to user interaction. in my case I'm switching workspaces and I'm adding some logic there, so I expect immediate reaction on a key-stroke. currently this takes enough time to be noticeable, so some optimization is necessary
