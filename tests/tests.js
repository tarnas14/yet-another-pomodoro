import fs from 'fs'
import path from 'path'

import test from 'tape'
import nrc from 'node-run-cmd'

const COFFEE_EMOJI = '☕'
const TEST_FILE_PATH = path.join(__dirname, "./yap-test-file")

const removeTestFile = () => fs.existsSync(TEST_FILE_PATH) && fs.unlinkSync(TEST_FILE_PATH)

const setup = () => {
  removeTestFile()
}

const teardown = () => {
  removeTestFile()
}

const withoutNewLine = data => data.replace(/\n/g, '')

const tests = (runYap, prefix) => {
  test(prefix + 'should get initial state and not create the file when `state` is called', async t => {
    setup()

    let output = ''

    // when
    const exitCodes = await runYap(`state`, {
      onData: data => { output = withoutNewLine(data) },
      onError: t.fail,
    })

    // then
    t.deepEqual(exitCodes, [ 0 ])
    t.equal(output, `WAITING_FOR_POMODORO ${COFFEE_EMOJI}P1${COFFEE_EMOJI}`)
    t.false(fs.existsSync(TEST_FILE_PATH))

    t.end()
    teardown()
  })

  test(prefix + 'should start pomodoro when `start` is called and create file', async t => {
    setup()

    // given
    let output = ''

    await runYap(`start`, {
      onError: t.fail,
    })

    // when
    const exitCodes = await runYap(`state`, {
      onData: data => { output = withoutNewLine(data) },
      onError: t.fail,
    })


    // then
    t.deepEqual(exitCodes, [ 0 ])
    t.true(output.startsWith('POMODORO'), 'starts with POMODORO')
    t.true(fs.existsSync(TEST_FILE_PATH), 'test file should exist')

    t.end()
    teardown()
  })

  test(prefix + 'should start pomodoro when `start` is called and create file', async t => {
    setup()

    // given
    let output = ''

    await runYap(`start`, {
      onError: t.fail,
    })

    // when
    const exitCodes = await runYap(`state`, {
      onData: data => { output = withoutNewLine(data) },
      onError: t.fail,
    })


    // then
    t.deepEqual(exitCodes, [ 0 ])
    t.true(output.startsWith('POMODORO'), 'starts with POMODORO')
    t.true(fs.existsSync(TEST_FILE_PATH))

    t.end()
    teardown()
  })

  test(prefix + 'should stop running pomodoro with `stop`', async t => {
    setup()

    // given
    let output = ''

    await runYap(`start`, {
      onError: t.fail,
    })
    await runYap(`stop`, {
      onError: t.fail,
    })

    // when
    const exitCodes = await runYap(`state`, {
      onData: data => { output = withoutNewLine(data) },
      onError: t.fail,
    })


    // then
    t.deepEqual(exitCodes, [ 0 ])
    t.equal(output, `WAITING_FOR_POMODORO ${COFFEE_EMOJI}P1${COFFEE_EMOJI}`)
    t.true(fs.existsSync(TEST_FILE_PATH))

    t.end()
    teardown()
  })

  test(prefix + 'should indicate `outside-pomodoro` state with exitCode', async t => {
    setup()

    // when
    const exitCodesWithoutFile = await runYap('outside-pomodoro', {
      onError: t.fail,
    })

    // then
    t.deepEqual(exitCodesWithoutFile, [0], 'should exit with 0 when no file')

    // when
    let errorsWhenInPomodoro = []
    await runYap('start', {
      onError: t.fail,
    })
    const exitCodeAfterPomodoroStart = await runYap('outside-pomodoro', {
      onError: error => errorsWhenInPomodoro.push(withoutNewLine(error))
    })

    // then
    t.deepEqual(exitCodeAfterPomodoroStart, [1], 'should exit with 1 after start')

    // TODO make node-yap output these to std:error
    if (errorsWhenInPomodoro.length) {
      t.deepEqual(errorsWhenInPomodoro, ['in pomodoro', 'exit status 1'])
    }

    // when
    await runYap('stop', {
      onError: t.fail,
    })
    const exitCodeAfterPomodoroStop = await runYap('outside-pomodoro', {
      onError: t.fail,
    })

    t.deepEqual(exitCodeAfterPomodoroStop, [0], 'should exit with 1 after start->stop')

    t.end()
    teardown()
  })
}

const runYapFactory = (command, file, commandOptions = {}) => (yapCommand, options) => nrc.run(`${command} --file ${file} ${yapCommand}`, {...commandOptions, ...options})

tests(runYapFactory('node ../node-yap/index.js', TEST_FILE_PATH), 'node-yap: ')
tests(runYapFactory('go run ./main.go', TEST_FILE_PATH, {cwd: '../go-yap'}), 'go-yap: ')

// make sure file is removed
removeTestFile()
