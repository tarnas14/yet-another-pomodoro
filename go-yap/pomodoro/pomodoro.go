package pomodoro

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"os"
	"time"
)

const COFFEE_EMOJI = "☕"

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

type Pomodoro struct {
	SessionCounter int    `json:"sessionCounter"`
	State          string `json:"state"`
	Start          int64  `json:"start"`
	End            int64  `json:"end"`
	notStartedYet  bool
	inProgress     bool
	finished       bool
}

const STATE_POMODORO string = "POMODORO"
const STATE_BREAK string = "BREAK"

func CreatePomodoro(now int64, path string) *Pomodoro {
	var pomodoro Pomodoro
	if fileExists(path) {
		yapContents, fileReadErr := ioutil.ReadFile(path)

		if fileReadErr != nil {
			log.Fatal(fileReadErr)
		}

		json.Unmarshal(yapContents, &pomodoro)
	} else {
		pomodoro.State = STATE_POMODORO
		pomodoro.Start = 0
		pomodoro.End = 0
		pomodoro.SessionCounter = 1
	}

	// magic logic here
	pomodoro.notStartedYet = pomodoro.Start == 0
	pomodoro.inProgress = pomodoro.Start != 0 && pomodoro.End != 0 && pomodoro.End >= now
	pomodoro.finished = pomodoro.Start != 0 && pomodoro.End != 0 && pomodoro.End < now

	if pomodoro.finished {
		pomodoro.SessionCounter += 1
		if pomodoro.State == STATE_BREAK {
			pomodoro.State = STATE_POMODORO
		}

		pomodoro.Start = 0
		pomodoro.End = 0
	}

	return &pomodoro
}

func Persist(pomodoro *Pomodoro, path string) {
	file, _ := json.MarshalIndent(pomodoro, "", " ")
	_ = ioutil.WriteFile(path, file, 0644)
}

func (pomodoro *Pomodoro) getDurationInMilliseconds() int64 {
	if pomodoro.State == STATE_POMODORO {
		return 25 * 60 * 1000
	}

	var long = pomodoro.SessionCounter % 8

	if long == 0 {
		return 15 * 60 * 1000
	}

	return 5 * 60 * 1000
}

func (pomodoro *Pomodoro) Next(now int64) {
	if pomodoro.State == STATE_POMODORO && pomodoro.inProgress {
		fmt.Println("you cant just skip during a pomodoro")

		return
	}

	// State is break, so we are skipping to pomodoro
	if pomodoro.inProgress {
		pomodoro.State = STATE_POMODORO
	}

	pomodoro.Start = now
	pomodoro.End = now + pomodoro.getDurationInMilliseconds()
}

func (pomodoro *Pomodoro) Stop() {
	pomodoro.Start = 0
	pomodoro.End = 0
}

func (pomodoro *Pomodoro) GoTime(now int64) {
	if pomodoro.SessionCounter > 1 || (pomodoro.inProgress || pomodoro.finished) {
		fmt.Println("already started")
		return
	}

	pomodoro.Next(now)
}

func (pomodoro *Pomodoro) Reset() {
	pomodoro.SessionCounter = 1
	pomodoro.State = STATE_POMODORO
	pomodoro.Start = 0
	pomodoro.End = 0
}

func (pomodoro *Pomodoro) ToString(now int64) string {
	var waitingPart = ""
	if !pomodoro.inProgress {
		waitingPart = "WAITING_FOR_"
	}

	var emojiOrNot = ""
	if pomodoro.State == STATE_BREAK {
		emojiOrNot = COFFEE_EMOJI
	}

	var timeLeft = ""
	if pomodoro.inProgress {
		// TODO this `+1` is here because of different JS implementation, should probably fix?
		var dur, _ = time.ParseDuration(fmt.Sprintf("%dms", pomodoro.End-now+1))

		var durationInSeconds = dur.Seconds()
		var minutes = int(math.Floor(durationInSeconds / 60))
		var seconds = int(durationInSeconds) - (minutes * 60)

		var minutesString = fmt.Sprintf("%d", minutes)

		var separatorString = ":"

		var secondsString = fmt.Sprintf("%d", seconds)
		if seconds < 10 {
			secondsString = fmt.Sprintf("0%d", seconds)
		}

		timeLeft = fmt.Sprintf("%s%s%s%s%s", emojiOrNot, minutesString, separatorString, secondsString, emojiOrNot)
	} else {
		timeLeft = fmt.Sprintf("%s%c%d%s", emojiOrNot, pomodoro.State[0], pomodoro.SessionCounter, emojiOrNot)
	}

	return fmt.Sprintf("%s%s %s", waitingPart, pomodoro.State, timeLeft)
}

func (pomodoro *Pomodoro) InPomodoro() bool {
	return pomodoro.State == STATE_POMODORO && pomodoro.inProgress
}
