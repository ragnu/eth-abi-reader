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
  return logs.map(logItem => {
    const methodId = logItem.topics[0].slice(2)
    const method = state.methodIds[methodId]
    if (method) {
      const logData = logItem.data
      const decodedParams = []
      let dataIndex = 0
      let topicsIndex = 1
      const dataTypes = method.inputs.map(input => {
        if (!input.indexed) return input.type
      })
      const decodedData = SolidityCoder.decodeParams(dataTypes, logData.slice(2))
      method.inputs.map(input => {
        const decodedInput = {
          name: input.name,
          type: input.type
        }
        if (input.indexed) {
          decodedInput.value = logItem.topics[topicsIndex]
          topicsIndex++
        } else {
          decodedInput.value = decodedData[dataIndex]
          dataIndex++
        }
        if (input.type === 'address') {
          decodedInput.value = padZeroes(new Web3().toBigNumber(decodedInput.value).toString(16))
        } else if (input.type === 'uint256' || input.type === 'uint8' || input.type === 'int') {
          decodedInput.value = new Web3().toBigNumber(decodedInput.value).toString(10)
        }
        decodedParams.push(decodedInput)
      })
      return {
        name: method.name,
        events: decodedParams,
        address: logItem.address
      }
    } else {
      return {}
    }
  })
}

module.exports = {
  getABI,
  addABI,
  removeABI,
  getMethodIds,
  decodeMethod,
  decodeLogs
}
