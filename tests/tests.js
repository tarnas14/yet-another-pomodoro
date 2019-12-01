import fs from 'fs'
import path from 'path'

import test from 'tape'
import nrc from 'node-run-cmd'

const COFFEE_EMOJI = '☕'
const TEST_FILE_PATH = path.join(__dirname, './yap-test-file')

const removeTestFile = () => fs.existsSync(TEST_FILE_PATH) && fs.unlinkSync(TEST_FILE_PATH)

const setup = () => {
  removeTestFile()
}

const teardown = () => {
  removeTestFile()
}

const withoutNewLine = data => data.replace(/\n/g, '')

const tests = async (runYap, {
  prefix,
  filePath,
  before = () => {}
}) => {
  await before();

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
    t.equal(output, `WAITING_FOR_POMODORO P1`)
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
    t.equal(output, `WAITING_FOR_POMODORO P1`)
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

    // TODO make node-yap output this to std:error
    if (errorsWhenInPomodoro.length) {
      t.deepEqual(errorsWhenInPomodoro, ['in pomodoro'])
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

  const fileGetter = (template, endPlus = 10001) => () => {
    const jsTimestamp = (new Date()).getTime()

    return {
      start: jsTimestamp - 1,
      end: jsTimestamp + endPlus,
      ...template,
    }
  }

  const testcases = [
    {
      file: fileGetter({'sessionCounter':8,'state':'POMODORO'}),
      expected: 'POMODORO 0:10',
    },
    {
      file: fileGetter({'sessionCounter':8,'state':'POMODORO'}, 120001),
      expected: 'POMODORO 2:00',
    },
    {
      file: fileGetter({'sessionCounter':8,'state':'POMODORO'}, 121001),
      expected: 'POMODORO 2:01',
    },
    {
      file: fileGetter({'sessionCounter':8,'state':'POMODORO',start:0,end:0}),
      expected: `WAITING_FOR_POMODORO P8`,
    },
    {
      file: fileGetter({'sessionCounter':9,'state':'BREAK'}),
      expected: `BREAK ${COFFEE_EMOJI}0:10${COFFEE_EMOJI}`,
    },
    {
      file: fileGetter({'sessionCounter':8,'state':'BREAK'}, 120001),
      expected: `BREAK ${COFFEE_EMOJI}2:00${COFFEE_EMOJI}`,
    },
    {
      file: fileGetter({'sessionCounter':8,'state':'BREAK'}, 121001),
      expected: `BREAK ${COFFEE_EMOJI}2:01${COFFEE_EMOJI}`,
    },
    {
      file: fileGetter({'sessionCounter':9,'state':'BREAK','start':0,'end':0}),
      expected: `WAITING_FOR_BREAK ${COFFEE_EMOJI}B9${COFFEE_EMOJI}`
    },
  ]

  testcases.forEach((testcase, index) => test(prefix + `should correctly show state based on file with JS unix-like timestamps [${index}]`, async t => {
    setup()

    fs.writeFileSync(filePath, JSON.stringify(testcase.file()))

    let output = ''
    const exitCodes = await runYap(`state`, {
      onData: data => { output = withoutNewLine(data) },
      onError: t.fail,
    })

    t.equal(output, testcase.expected)

    t.end()
    teardown()
  }))
}

const runYapFactory = (command, file, commandOptions = {}) => (yapCommand, options) => nrc.run(`${command} --file ${file} ${yapCommand}`, {...commandOptions, ...options})

tests(runYapFactory('node ../node-yap/index.js', TEST_FILE_PATH), {
  prefix: 'node-yap: ',
  filePath: TEST_FILE_PATH,
})

tests(runYapFactory('./main', TEST_FILE_PATH, {cwd: '../go-yap'}), {
  prefix: 'go-yap: ',
  filePath: TEST_FILE_PATH,
  before: () => nrc.run(`go build ./main.go`, {cwd: '../go-yap'})
})
