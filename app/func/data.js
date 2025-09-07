import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function saveHtmlToFile(htmlContent, filename) {
    const dumpsDir = path.resolve(__dirname, '../dump')
    const filePath = path.join(dumpsDir, filename)
    
    try {
        if (!fs.existsSync(dumpsDir)) {
            fs.mkdirSync(dumpsDir, { recursive: true })
        }
        fs.writeFileSync(filePath, htmlContent, 'utf8')
    } catch (error) {
        console.error('[ ERROR ] Error writing file:', error)
        return
    }
    console.log(`[ OK ] HTML content saved to ${filePath}`)
}
export default saveHtmlToFile