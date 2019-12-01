import fs from 'fs'
import test from 'tape'

const TEST_FILE_PATH = "./yap-test-file"

const setup = () => {
  fs.unlinkSync(TEST_FILE_PATH)
}

const teardown = () => {
  fs.unlinkSync(TEST_FILE_PATH)
}

test('A passing test', (assert) => {

  assert.pass('This test will pass.')

  assert.end()
})
