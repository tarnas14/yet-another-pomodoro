package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/tarnas14/yet-another-pomodoro/go-yap/pomodoro"
	"github.com/urfave/cli"
)

const DEFAULT_FILE_PATH = "/home/tarnas/.yap"

func main() {
	var now = time.Now().Unix() * 1000
	var filePath string

	app := cli.NewApp()

	fileFlag := cli.StringFlag{
		Name:        "file",
		Value:       DEFAULT_FILE_PATH,
		Destination: &filePath,
	}

	app.Flags = []cli.Flag{
		&fileFlag,
	}

	app.Commands = []cli.Command{
		{
			Name:  "state",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				fmt.Println(currentPomodoro.ToString(now))

				return nil
			},
		},
		{
			Name:  "next",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				currentPomodoro.Next(now)

				pomodoro.Persist(currentPomodoro, filePath)

				return nil
			},
		},
		{
			Name:  "stop",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				currentPomodoro.Stop()

				pomodoro.Persist(currentPomodoro, filePath)

				return nil
			},
		},
		{
			Name:  "start",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				currentPomodoro.GoTime(now)

				pomodoro.Persist(currentPomodoro, filePath)

				return nil
			},
		},
		{
			Name:  "reset",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				currentPomodoro.Reset()

				pomodoro.Persist(currentPomodoro, filePath)

				return nil
			},
		},
		{
			Name:  "outside-pomodoro",
			Usage: "",
			Action: func(c *cli.Context) error {
				currentPomodoro := pomodoro.CreatePomodoro(now, filePath)

				if currentPomodoro.InPomodoro() {
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
