import fs from 'fs'
import test from 'tape'
import nrc from 'node-run-cmd'

const COFFEE_EMOJI = '☕'
const TEST_FILE_PATH = "./yap-test-file"

const removeTestFile = () => fs.existsSync(TEST_FILE_PATH) && fs.unlinkSync(TEST_FILE_PATH)

const setup = () => {
  removeTestFile()
}

const teardown = () => {
  removeTestFile()
}

const withoutNewLine = data => data.replace(/\n/g, '')

const tests = runYap => {
  test('should get initial state and not create the file when `state` is called', async t => {
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

  test('should start pomodoro when `start` is called and create file', async t => {
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

  test('should start pomodoro when `start` is called and create file', async t => {
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

  test('should stop running pomodoro with `stop`', async t => {
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

  test('should indicate `outside-pomodoro` state with exitCode', async t => {
    setup()

    // when
    const exitCodesWithoutFile = await runYap('outside-pomodoro', {
      onError: t.fail,
    })

    // then
    t.deepEqual(exitCodesWithoutFile, [0])

    // when
    await runYap('start', {
      onError: t.fail,
    })
    const exitCodeAfterPomodoroStart = await runYap('outside-pomodoro', {
      onError: t.fail,
    })

    // then
    t.deepEqual(exitCodeAfterPomodoroStart, [1])

    // when
    await runYap('stop', {
      onError: t.fail,
    })
    const exitCodeAfterPomodoroStop = await runYap('outside-pomodoro', {
      onError: t.fail,
    })

    t.deepEqual(exitCodeAfterPomodoroStop, [0])

    t.end()
    teardown()
  })
}

const runYapFactory = (command, file) => (yapCommand, options) => nrc.run(`${command} --file ${file} ${yapCommand}`, options)

tests(runYapFactory('node ../node-yap/index.js', TEST_FILE_PATH))
