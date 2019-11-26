#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const program = require('commander')
const humanizeDuration = require('pretty-ms')

const packageJson = require('./package.json')

program.version(packageJson.version)

program.option('-d, --debug', 'output extra debugging')
program.option('-f, --file <file>', 'force file')

const STATE = {
  POMODORO: 'POMODORO',
  BREAK: 'BREAK_SHORT',
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

const getDurationInMilliseconds = state => {
  if (state === STATE.POMODORO) {
    return 25 * 60 * 1000
  }

  const long = state.sessionCounter % 8

  return long
    ? 15 * 60 * 1000
    : 5 * 60 * 1000
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
      current.state = STATE.POMODORO
    }

    currentState.start = now
    currentState.end = now + getDurationInMilliseconds(currentState.state)
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

  const persist = () => {
    const {sessionCounter, state, start, end} = currentState

    fs.writeFileSync(storageFilePath, JSON.stringify({
      sessionCounter, state, start, end
    }))
  }

  const getStringState = () => {
    return `${!currentState.inProgress ? 'WAITING_FOR_' : ''}${currentState.state} ${currentState.inProgress
      ? humanizeDuration(currentState.end - now, {colonNotation: true, secondsDecimalDigits: 0})
      : `${currentState.state[0]}${currentState.sessionCounter}`
    }`
  }

  return {
    next,
    start,
    stop,
    reset,
    persist,
    getStringState,
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
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.start()
    onExit(yap)
  });

program
  .command('stop')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.stop()
    onExit(yap)
  });

program
  .command('reset')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.reset()
    onExit(yap)
  });

program
  .command('next')
  .action(() => {
    const yap = yapFactory(now, program.file)
    yap.next()
    onExit(yap)
  });

program
  .command('state')
  .action(() => {
    const yap = yapFactory(now, program.file)
    console.log(yap.getStringState())
    onExit(yap)
  });

program.parse(process.argv)
