import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import type { Request, Response } from 'express'
import express from 'express'

import type { GenerateZkProofParams } from '@/models/generate-proof-params.model'
import { generateZKProof } from '@/utils/generate-zk-proof'

import { ensureEnvVar } from './utils'

dotenv.config()

const port = ensureEnvVar(process.env.PORT, 'PORT')

const app = express()

app.use(bodyParser.json())

app.post('/generate-zk-proof', async (req: Request, res: Response) => {
	try {
		const params: GenerateZkProofParams = req.body

		if (!params) {
			res.status(400).json({ error: 'Invalid input' })
			return
		}

		res.json(await generateZKProof(params))
	} catch (error) {
		console.error('❌ Failed to generate proof:', error)
		res.status(500).json({
			success: false,
			message: (error as Error).message
		})
	}
})

app.listen(port, () => {
	console.log(`🚀 Server is running on http://localhost:${port}`)
})
