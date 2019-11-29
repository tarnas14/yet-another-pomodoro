package main

import (
  "time"
  "os"
  "fmt"
  "log"
  "io/ioutil"
  "encoding/json"

  "github.com/urfave/cli"
)

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

type PomodoroPersistedState struct {
  SessionCounter int `json:"sessionCounter"`
  State string `json:"state"`
  Start int64 `json:"start"`
  End int64 `json:"end"`
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
  data := PomodoroPersistedState{
    SessionCounter: currentState.SessionCounter,
    State: currentState.State,
    Start: currentState.Start,
    End: currentState.End,
  }

  file,_ := json.MarshalIndent(data, "", " ")
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

  var timeLeft = ""
  if (currentState.inProgress) {
    var dur,_ = time.ParseDuration(fmt.Sprintf("%ds", currentState.End - now))
    timeLeft = dur.String()
  } else {
    timeLeft = fmt.Sprintf("☕%c%d☕", currentState.State[0], currentState.SessionCounter)
  }

  return fmt.Sprintf("%s%s %s", waitingPart, currentState.State, timeLeft)
}

func main() {
  var now = time.Now().Unix() * 1000
  app := cli.NewApp()

  const DEFAULT_FILE_PATH = "/home/tarnas/.yap"

  currentState := getCurrentState(now, DEFAULT_FILE_PATH)

  app.Commands = []*cli.Command{
  {
      Name:    "state",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        var state = getStringState(currentState, now)

        fmt.Println(state)

        return nil
      },
    },
    {
      Name:    "next",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        next(currentState, now)

        persist(currentState, DEFAULT_FILE_PATH)

        return nil
      },
    },
    {
      Name:    "stop",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        stop(currentState)

        persist(currentState, DEFAULT_FILE_PATH)

        return nil
      },
    },
    {
      Name:    "start",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        start(currentState, now)

        persist(currentState, DEFAULT_FILE_PATH)

        return nil
      },
    },
    {
      Name:    "reset",
      Usage:   "",
      Action:  func(c *cli.Context) error {
        reset(currentState)

        persist(currentState, DEFAULT_FILE_PATH)

        return nil
      },
    },
    {
      Name:    "outside-pomodoro",
      Usage:   "",
      Action:  func(c *cli.Context) error {
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
