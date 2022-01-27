const Bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')


const incrementBuffer = (buffer, offset = 0) => {
	const idx = buffer.length - 1 - offset
	const val = buffer.readUInt8(idx)
	if (val === 255) {
		buffer.writeUInt8(0, idx)
		return incrementBuffer(buffer, offset + 1)
	}
	buffer.writeUInt8(val + 1, idx)
	return buffer
}

const genBufferRange = function* (buf, limit = 0) {
	yield buf
	for (let i = 1; limit !== 0 && i < limit; i++) {
		yield incrementBuffer(buf)
	}
	return buf
}

const addressFromMnemonic = function (mnemonic) { // 2.93ms
	const seed = bip39.mnemonicToSeed(mnemonic) // 2.18ms

	const node = Bitcoin.bip32.fromSeed(seed)
		.deriveHardened(510742)
		.deriveHardened(12)
		.deriveHardened(0)

	return Bitcoin.payments.p2pkh({pubkey: node.publicKey}).address
}

module.exports = addressFromMnemonic;
module.exports.addressFromMnemonic = addressFromMnemonic;
module.exports.incrementBuffer = incrementBuffer;
module.exports.genBufferRange = genBufferRange;
module.exports.bip39 = bip39;

if (process.argv[1] === __filename) {
	if (process.argv[2]) {
		try {
			console.log(addressFromMnemonic(process.argv.slice(2).join(' ')))
			process.exit(0)
		} catch (e) {
			console.log("Error: " + e.message)
		}
	}
	console.log("Usage: node index.js because grunt clip sauce prison junior smart vicious tiny double deputy horse notable use swift")
}

