const SolidityCoder = require('web3/lib/solidity/coder.js')
const Web3 = require('web3')

const state = {
  savedABIs: [],
  methodIds: {}
}

function getABIs() {
  return state.savedABIs
}

function addABI(abiArray) {
  if (Array.isArray(abiArray)) {
    abiArray.map((abi) => {
      if (abi.name) {
        const signature = new Web3().sha3(abi.name + '(' + abi.inputs.map(input => input.type).join(',') + ')')
        if (abi.type === 'event') {
          state.methodIds[signature.slice(2)] = abi
        } else {
          state.methodIds[signature.slice(2, 10)] = abi
        }
      }
    })
    state.savedABIs = state.savedABIs.concat(abiArray)
  } else {
    throw new Error('Expected ABI array, got ' + typeof abiArray)
  }
}

function removeABI(abiArray) {
  if (Array.isArray(abiArray)) {
    abiArray.map((abi) => {
      if (abi.name) {
        const signature = new Web3().sha3(abi.name + '(' + abi.inputs.map(input => input.type).join(',') + ')')
        if (abi.type === 'event') {
          if (state.methodIds[signature.slice(2)]) {
            delete state.methodIds[signature.slice(2)]
          }
        } else {
          if (state.methodIds[signature.slice(2, 10)]) {
            delete state.methodIds[signature.slice(2, 10)]
          }
        }
      }
    })
    state.savedABIs = state.savedABIs.concat(abiArray)
  } else {
    throw new Error('Expected ABI array, got ' + typeof abiArray)
  }
}

function getMethodIds() {
  return state.methodIds
}

function padZeroes(address) {
  const tempStr = address.substr(0, 2) === '0x' ? address.substr(2) : address
  return '0x' + tempStr.padStart(40, '0')
}

function decodeMethod(data) {
  const methodId = data.slice(2, 10)
  const abiItem = state.methodIds[methodId]
  if (abiItem) {
    const params = abiItem.inputs.map(item => item.type)
    const decoded = SolidityCoder.decodeParams(params, data.slice(10))
    return {
      name: abiItem.name,
      params: decoded.map((param, i) => {
        const parsedParam = abiItem.inputs[i].type.indexOf('uint') !== -1 ? new Web3().toBigNumber(param).toString() : param
        return {
          name: abiItem.inputs[i].name,
          value: parsedParam,
          type: abiItem.inputs[i].type
        }
      })
    }
  } else {
    return {}
  }
}

function decodeLogs(logs) {
  //
}

module.exports = {
  getABI,
  addABI,
  removeABI,
  getMethodIds,
  decodeMethod,
  decodeLogs
}
