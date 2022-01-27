const {Buffer} = require('buffer')
const fs = require('fs')
const fetch = require('node-fetch')

const {addressFromMnemonic, incrementBuffer, bip39} = require('./helpers')

const delay = (ms) => new Promise(ok => setTimeout(ok, ms))
const instant = () => new Promise(ok => setImmediate(ok))

const startedMnemonic = bip39.generateMnemonic()
const currentEntropy = Buffer.from(bip39.mnemonicToEntropy(startedMnemonic), 'hex');


const lastUsed = {};

const getCooldown = (key, time) => Math.max((lastUsed[key] ?? 0) - Date.now() + time, 0)
const useCooldown = (key) => lastUsed[key] = Date.now()
const waitCooldown = (key, time) => delay(getCooldown(key, time) + 1)
const cooldown = (key, time) => waitCooldown(key, time).then(() => useCooldown(key));


(async () => {
	const file = fs.createWriteStream('./logs/' + Date.now() + '.txt', {flags: 'a'});

	const oneThread = async (blockSize = 135, maxReqs = 30) => {
		let req = Promise.resolve();

		for (let iteration = 0; iteration < maxReqs; iteration++) {
			const genStart = Date.now();
			const entropies = [];

			for (let iteration = 0; iteration < blockSize; iteration++) {
				entropies.push(currentEntropy.toString('hex'))
				incrementBuffer(currentEntropy)
			}

			const base = entropies[0];
			
			const addresses = [];
			for (const entropy of entropies) {
				addresses.push(addressFromMnemonic(bip39.entropyToMnemonic(entropy)))
				await instant();
			}

			const genEnd = Date.now();
			
			await req;
			
			
			const cd = getCooldown('direct', 1100);
			await cooldown('direct', 1100);
			
			const reqStart = Date.now();
			req = fetch("https://blockchain.info/multiaddr?n=0&active=" + encodeURIComponent(addresses.join('|')))
			.then(async (result) => {
				const text = await result.text();
				try {
					const json = JSON.parse(text);
					const bal = json.wallet.final_balance;
					file.write(`${Date.now()}-(${genEnd-genStart}+${Date.now()-reqStart}-${cd}), 
					${parseInt(bal) === 0 ? 'EMPTY' : '_______________________MONEY____________________'}, ${bal}, 
					${base}+${blockSize},\n`);
				} catch(e) {
					file.write(`${Date.now()}-(${genEnd-genStart}-${Date.now()-reqStart}-${cd}), PARSING_ERROR, -1,
					 ${base}+${blockSize}, ${JSON.stringify(text)}, \n`);
				}
			}).catch(e => {
				file.write(`${Date.now()}-(${genEnd-genStart}-${Date.now()-reqStart}-${cd}), REQ_ERROR, -1, ${base}+${blockSize}, ${e.message}\n`);
			});
		}
	}

	module.exports = oneThread;
	oneThread(135, 600)
})()