#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const program = require('commander')
const humanizeDuration = require('pretty-ms')

const packageJson = require('./package.json')

program.version(packageJson.version)

program.option('-d, --debug', 'output extra debugging')
program.option('-f, --file <file>', 'point to a state file (.yap)')

const STATE = {
  POMODORO: 'POMODORO',
  BREAK: 'BREAK',
}

const defaultState = {
  sessionCounter: 1,
  state: STATE.POMODORO,
  start: null,
  end: null,
}

const calculateState = (now, persistence) => {
  const current = {...persistence}

  current.notStartedYet = !current.start
  current.inProgress = current.start && current.end && current.end >= now
  current.finished = current.start && current.end && current.end < now

  if (current.finished) {
    current.sessionCounter += 1
    current.state = current.state === STATE.POMODORO
      ? STATE.BREAK
      : STATE.POMODORO
    current.start = null
    current.end = null
  }

  return current
}

const getDurationInMilliseconds = currentState => {
  if (currentState.state === STATE.POMODORO) {
    return 25 * 60 * 1000
  }

  const long = currentState.sessionCounter % 8

  return long
    ? 5 * 60 * 1000
    : 15 * 60 * 1000
}

const yapFactory = (now, storageFilePath = path.join(os.homedir(), '.yap')) => {
  const persistedState = fs.existsSync(storageFilePath)
    ? JSON.parse(fs.readFileSync(storageFilePath))
    : defaultState

  const currentState = calculateState(now, persistedState)

  const next = () => {
    if (currentState.state === STATE.POMODORO && currentState.inProgress) {
      console.log('you cant just skip during a pomodoro')

      return
    }

    // state is break, so we are skipping to pomodoro
    if (currentState.inProgress) {
      currentState.state = STATE.POMODORO
    }

    currentState.start = now
    currentState.end = now + getDurationInMilliseconds(currentState)
  }

  const start = () => {
    if (currentState.sessionCounter > 1 || (currentState.inProgress || currentState.finished)) {
      console.log('already started')
      return
    }

    next()
  }

  const stop = () => {
    currentState.start = null
    currentState.end = null
  }

  const reset = () => {
    currentState.sessionCounter = defaultState.sessionCounter
    currentState.state = defaultState.state
    currentState.start = defaultState.start
    currentState.end = defaultState.end
  }

  const outsidePomodoro = () => !(currentState.state === STATE.POMODORO && currentState.inProgress)

  const persist = () => {
    const {sessionCounter, state, start, end} = currentState

    fs.writeFile(storageFilePath, JSON.stringify({
      sessionCounter, state, start, end
    }), () => null)
  }

  const getStringState = () => {
    return `${!currentState.inProgress ? 'WAITING_FOR_' : ''}${currentState.state} ${currentState.inProgress
      ? `${humanizeDuration(currentState.end - now, {colonNotation: true, secondsDecimalDigits: 0})}`
      : `☕${currentState.state[0]}${currentState.sessionCounter}☕`
    }`
  }

  return {
    next,
    start,
    stop,
    reset,
    persist,
    getStringState,
    outsidePomodoro,
    debug: () => console.log(currentState)
  }
}

const now = (new Date()).getTime()

const onExit = yapInstance => {
  program.debug && yapInstance.debug()
  yapInstance.persist()
}

program
  .command('start')
  .description('start the pomodoro session - you should only run this when you run the app for the first time or after `restart`')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.start()
    onExit(yap)
  });

program
  .command('stop')
  .description('stop - stops the timer if you are in progress (noop if the app is not counting time)')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.stop()
    onExit(yap)
  });

program
  .command('reset')
  .description('resets the session to the initial state - wipes current timer and resets session counter to 0')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.reset()
    onExit(yap)
  });

program
  .command('next')
  .description('goes to the next interval. however, YOU CAN\'T SKIP POMODORO IN PROGRESS. lets you skip a break and go to productivity period')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.next()
    onExit(yap)
  });

program
  .command('outside-pomodoro')
  .description('does not output anything. check exit code if you are inside the pomodoro or not. 0 means outside pomodoro. 1 you are in pomodoro.')
  .action(() => {
    const yap = yapFactory(now, program.file)
    const result = yap.outsidePomodoro()

    process.exitCode = result ? 0 : 1
  });

program
  .command('state')
  .description(`get state representation of your pomodoro session. will be in following format: '<STATE> <time left/next period representation>' if you are on a break, coffe emojis will be in the beginning and end of the <time/next period>`)
  .action(() => {
    const yap = yapFactory(now, program.file)
    console.log(yap.getStringState())
  });

program.parse(process.argv)
