import * as fs from 'fs'
import * as readline from 'readline'

const CodonTable: { codes: {[key: string]: string}, start: string[], stop: string[] } = JSON.parse(fs.readFileSync('./codon_table.json').toString())
const Codons = Object.keys(CodonTable.codes)
const AminoAcids = Object.values(CodonTable.codes)

const r = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const bar = '-'.repeat(60) + '\n'

interface GameData {
  askLength: number
  answer: string,
  score: number,
  correct: number,
  stage: number,
  startTime: number,
  timeData: number[],
  wrongData: { [code: string]: number }
}

const GameData: GameData = {
  askLength: 0,
  answer: '',
  score: 0,
  correct: 0,
  stage: 0,
  startTime: 0,
  timeData: [],
  wrongData: {}
}

function getCorrectRatio (correct: number, total: number) {
  return total && Math.floor(correct / total * 1000) / 10
}

function getAverageTime (timeData: number[]) {
  return timeData.length && Math.floor(timeData.reduce((sum, value) => sum + value) / timeData.length) / 1000
}

function createRNASequence (headLength: number, tailLength: number) {
  let sequence = ''
  let answer = ''
  const startCodon = CodonTable.start[Math.floor(Math.random() * CodonTable.start.length)]
  sequence += startCodon
  answer += AminoAcids[Codons.indexOf(startCodon)]
  for (let i = 1; i < GameData.askLength - 1; i++) {
    const index = Math.floor(Math.random() * Codons.length)
    sequence += Codons[index]
    answer += AminoAcids[index]
  }
  const stopCodon = CodonTable.stop[Math.floor(Math.random() * CodonTable.stop.length)]
  sequence += stopCodon
  const codes = ['A', 'G', 'C', 'U']
  let newSequence = sequence
  for (let i = 0; i < headLength; i++) {
    newSequence = codes[Math.floor(Math.random() * codes.length)] + newSequence
  }
  for (let i = 0; i < tailLength; i++) {
    newSequence = newSequence + codes[Math.floor(Math.random() * codes.length)]
  }
  for (let i = 0; i < newSequence.length - 2; i++) {
    const testCodon = newSequence.substr(i, 3)
    if (CodonTable.start.includes(testCodon) && i !== headLength) {
      return createRNASequence(headLength, tailLength)
    } else if (CodonTable.stop.includes(testCodon) && i !== newSequence.length - tailLength - 3) {
      return createRNASequence(headLength, tailLength)
    }
  }
  return { sequence: newSequence, answer}
}

enum SequenceType {
  RNA_TEMPLATE = 0,
  RNA_TEMPLATE_REVERSE = 1,
  RNA_NONTEMPLATE = 2,
  RNA_NONTEMPLATE_REVERSE = 3,
  DNA_TEMPLATE = 4,
  DNA_TEMPLATE_REVERSE = 5,
  DNA_NONTEMPLATE = 6,
  DNA_NONTEMPLATE_REVERSE = 7
}

function reverseAminoAcid (sequence: string) {
  const reverseTable = {
    "A": "U",
    "U": "A",
    "C": "G",
    "G": "C"
  }
  return sequence.split('').map((v) => reverseTable[v]).join('')
}

function createSequence (type: SequenceType) { 
  const { sequence, answer } = createRNASequence(Math.floor(Math.random() * 2) + 2, Math.floor(Math.random() * 2) + 2)
  switch(type) {
    case SequenceType.RNA_TEMPLATE:
      return { sequence: `5'-${sequence}-3'`, answer }
    case SequenceType.RNA_TEMPLATE_REVERSE:
      return { sequence: `3'-${sequence.split('').reverse().join('')}-5'`, answer }
    case SequenceType.RNA_NONTEMPLATE:
      return { sequence: `5'-${reverseAminoAcid(sequence.split('').reverse().join(''))}-3'`, answer }
    case SequenceType.RNA_NONTEMPLATE_REVERSE:
      return { sequence: `3'-${reverseAminoAcid(sequence)}-5'`, answer }
    case SequenceType.DNA_TEMPLATE:
      return { sequence: `5'-${sequence.split('').reverse().join('').replace(/U/g, 'T')}-3'`, answer }
    case SequenceType.DNA_TEMPLATE_REVERSE:
      return { sequence: `3'-${sequence.replace(/U/g, 'T')}-5'`, answer }
    case SequenceType.DNA_NONTEMPLATE:
      return { sequence: `5'-${reverseAminoAcid(sequence).replace(/U/g, 'T')}-3'`, answer }
    case SequenceType.DNA_NONTEMPLATE_REVERSE:
      return { sequence: `3'-${reverseAminoAcid(sequence.split('').reverse().join('')).replace(/U/g, 'T')}-5'`, answer }
  }
}

function ask (upperMessage?: string) {
  console.clear()
  console.log('\x1b[1m\x1b[37m')
  GameData.askLength = Math.floor(Math.random() * 3 + 8)

  // 추후 Parameter 수정을 통해 기능 접근 가능
  const { sequence, answer } = createSequence(SequenceType.RNA_TEMPLATE)
  GameData.answer = answer
  GameData.startTime = Date.now()
  GameData.stage++
  if (upperMessage) {
    console.log(``)
    console.log(upperMessage + '\n')
  }
  console.log(bar)
  console.log(`점수: \x1b[36m${GameData.score}\x1b[37m\t\t정확도: \x1b[36m${getCorrectRatio(GameData.correct, GameData.stage - 1)}\x1b[37m%\t\t평균 소요 시간: \x1b[36m${getAverageTime(GameData.timeData)}\x1b[37ms\n`)
  console.log(bar)
  console.log(`스테이지 \x1b[36m${GameData.stage}\x1b[37m\n`)
  console.log(`염기서열: ${sequence}\n`)
  r.prompt()
}

function processWrongAnswer (answer: string) {
  if (answer.length !== GameData.answer.length) return
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] !== GameData.answer[i]) {
      if (!GameData.wrongData[answer[i]]) GameData.wrongData[answer[i]] = 0
      GameData.wrongData[answer[i]]++
      if (!GameData.wrongData[GameData.answer[i]]) GameData.wrongData[GameData.answer[i]] = 0
      GameData.wrongData[GameData.answer[i]]++
    }
  }
}

function checkAnswer (answer: string) {
  const estimatedTime = Date.now() - GameData.startTime
  GameData.timeData.push(estimatedTime)
  if (GameData.answer === answer.toUpperCase()) {
    GameData.score++
    GameData.correct++
    ask('\x1b[32m맞았습니다!\x1b[37m')
  } else {
    processWrongAnswer(answer)
    ask(`\x1b[31m틀렸습니다. 정답: ${GameData.answer}, 제출한 답: ${answer}\x1b[37m`)
  }
}

r.on('line', (line) => {
  if (line === 'exit') {
    console.log('학습을 종료합니다. 틀린 코돈을 확인해 보세요.')
    Object.keys(GameData.wrongData).forEach((v, i) => {
      console.log(`\x1b[36m${v}\x1b[37m: \x1b[36m${GameData.wrongData[v]}\x1b[37m 번 틀렸습니다.`)
    })
    r.close()
    process.exit()
  }
  checkAnswer(line)
})

r.setPrompt('번역: ')
ask()