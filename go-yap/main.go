package main

import (
  "math"
  "time"
  "os"
  "fmt"
  "log"
  "io/ioutil"
  "encoding/json"

  "github.com/urfave/cli"
)

const DEFAULT_FILE_PATH = "/home/tarnas/.yap"
const COFFEE_EMOJI = "☕"

func fileExists(filename string) bool {
  info, err := os.Stat(filename)
  if os.IsNotExist(err) {
    return false
  }
  return !info.IsDir()
}

type PomodoroState struct {
  SessionCounter int  `json:"sessionCounter"`
  State string  `json:"state"`
  Start int64 `json:"start"`
  End int64 `json:"end"`
  notStartedYet bool
  inProgress bool
  finished bool
}

const STATE_POMODORO string = "POMODORO"
const STATE_BREAK string = "BREAK"

func getCurrentState(now int64, path string) *PomodoroState {
  var currentState PomodoroState
  if (fileExists(path)) {
    yapContents, fileReadErr := ioutil.ReadFile(path)

    if fileReadErr != nil {
      log.Fatal(fileReadErr)
    }

    json.Unmarshal(yapContents,  &currentState)
  } else {
    currentState.State = STATE_POMODORO
    currentState.Start = 0
    currentState.End = 0
    currentState.SessionCounter = 1
  }

  // magic logic here
  currentState.notStartedYet = currentState.Start == 0
  currentState.inProgress = currentState.Start != 0 && currentState.End != 0 && currentState.End >= now
  currentState.finished = currentState.Start != 0 && currentState.End != 0 && currentState.End < now

  if (currentState.finished) {
    currentState.SessionCounter += 1
    if (currentState.State == STATE_BREAK) {
      currentState.State = STATE_POMODORO
    }

    currentState.Start = 0
    currentState.End = 0
  }

  return &currentState
}

func persist(currentState *PomodoroState, path string) {
  file,_ := json.MarshalIndent(currentState, "", " ")
  _ = ioutil.WriteFile(path, file, 0644)
}

func getDurationInMilliseconds (currentState *PomodoroState) int64 {
  if (currentState.State == STATE_POMODORO) {
    return 25 * 60 * 1000
  }

  var long = currentState.SessionCounter % 8

  if (long == 0) {
    return 15 * 60 * 1000
  }

  return 5 * 60 * 1000
}

func next(currentState *PomodoroState, now int64) {
  if (currentState.State == STATE_POMODORO && currentState.inProgress) {
    fmt.Println("you cant just skip during a pomodoro")

    return
  }

  // State is break, so we are skipping to pomodoro
  if (currentState.inProgress) {
    currentState.State = STATE_POMODORO
  }

  currentState.Start = now
  currentState.End = now + getDurationInMilliseconds(currentState)
}

func stop(currentState *PomodoroState) {
  currentState.Start = 0
  currentState.End = 0
}

func start(currentState *PomodoroState, now int64) {
  if (currentState.SessionCounter > 1 || (currentState.inProgress || currentState.finished)) {
    fmt.Println("already started")
    return
  }

  next(currentState, now)
}

func reset(currentState *PomodoroState) {
  currentState.SessionCounter = 1
  currentState.State = STATE_POMODORO
  currentState.Start = 0
  currentState.End = 0
}

func getStringState(currentState *PomodoroState, now int64) string {
  var waitingPart = ""
  if (!currentState.inProgress) {
    waitingPart = "WAITING_FOR_"
  }

  var emojiOrNot = ""
  if (currentState.State == STATE_BREAK) {
    emojiOrNot = COFFEE_EMOJI
  }

  var timeLeft = ""
  if (currentState.inProgress) {
    // TODO this `+1` is here because of different JS implementation, should probably fix?
    var dur,_ = time.ParseDuration(fmt.Sprintf("%dms", currentState.End - now + 1))

    var durationInSeconds = dur.Seconds()
    var minutes = int(math.Floor(durationInSeconds / 60))
    var seconds = int(durationInSeconds) - (minutes * 60)

    var minutesString = fmt.Sprintf("%d", minutes)

    var separatorString = ":"

    var secondsString = fmt.Sprintf("%d", seconds)
    if (seconds < 10) {
      secondsString = fmt.Sprintf("0%d", seconds)
    }

    timeLeft = fmt.Sprintf("%s%s%s%s%s", emojiOrNot, minutesString, separatorString, secondsString, emojiOrNot)
  } else {
    timeLeft = fmt.Sprintf("%s%c%d%s", emojiOrNot, currentState.State[0], currentState.SessionCounter, emojiOrNot)
  }

  return fmt.Sprintf("%s%s %s", waitingPart, currentState.State, timeLeft)
}

func main() {
  var now = time.Now().Unix() * 1000
  var filePath string

  app := cli.NewApp()

  fileFlag := cli.StringFlag{
    Name: "file",
    Value: DEFAULT_FILE_PATH,
    Destination: &filePath,
  }

  app.Flags = []cli.Flag {
    &fileFlag,
  }

  app.Commands = []cli.Command{
    {
      Name:    "state",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        var state = getStringState(currentState, now)

        fmt.Println(state)

        return nil
      },
    },
    {
      Name:    "next",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        next(currentState, now)

        persist(currentState, filePath)

        return nil
      },
    },
    {
      Name:    "stop",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        stop(currentState)

        persist(currentState, filePath)

        return nil
      },
    },
    {
      Name:    "start",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        start(currentState, now)

        persist(currentState, filePath)

        return nil
      },
    },
    {
      Name:    "reset",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        reset(currentState)

        persist(currentState, filePath)

        return nil
      },
    },
    {
      Name:    "outside-pomodoro",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        currentState := getCurrentState(now, filePath)

        if (currentState.State == STATE_POMODORO && currentState.inProgress) {
          return cli.NewExitError("in pomodoro", 1)
        }

        return nil
      },
    },
  }

  err := app.Run(os.Args)

  if err != nil {
    log.Fatal(err)
  }
}
