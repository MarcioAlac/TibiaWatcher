import axios from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import save from './func/data.js'
import * as cheerio from 'cheerio'
import promptSync from 'prompt-sync'
import inquirer from 'inquirer'

/**
 * Tibia
 * 
 * Classe principal para automação e monitoramento de contas e personagens do Tibia via web scraping.
 * Permite login, seleção de personagem, exibição de histórico de mortes e vigilância em tempo real.
 * Utiliza requisições HTTP.
 * 
 * @class
 * @example
 * const tibia = new Tibia();
 * tibia.setEmail('user@email.com');
 * tibia.setPassword('password123');
 * tibia.setSpeak(true);
 * await tibia.start();
 * 
 * @property {Object} userData - Dados do usuário (email, senha, nome do personagem).
 * @property {CookieJar} jar - Gerenciador de cookies para sessões HTTP.
 * @property {AxiosInstance} client - Instância Axios configurada para requisições autenticadas.
 * @property {boolean} debug - Ativa/desativa mensagens de depuração no console.
 * 
 * @method setSpeak(bool) - Ativa/desativa mensagens de depuração.
 * @method setEmail(email) - Define o e-mail do usuário.
 * @method setPassword(password) - Define a senha do usuário.
 * @method setCharName(charName) - Define o nome do personagem.
 * @method speak - Exibe mensagens coloridas no console conforme o tipo.
 * @method start() - Inicia o fluxo principal de login, seleção de personagem e monitoramento.
 * @method showCharactersList(list) - Exibe lista formatada de personagens disponíveis.
 * @method havePin(data) - Verifica o status da conta (PIN, login, IP, sucesso).
 * 
 * @private
 * @method #loginPage() - Realiza requisição GET para página de login.
 * @method #accountPage - Realiza requisição POST para autenticação.
 * @method #scrapChars(data) - Extrai lista de personagens do HTML da conta.
 * @method #getCharStatus(name) - Busca histórico de mortes do personagem.
 */
class Tibia {
    constructor() {
        console.clear()
        this.userData   = {}
        this.jar        = new CookieJar()
        this.client     = wrapper(axios.create({ jar: this.jar }))
        this.debug      = false
    }
    // Setters
    setSpeak(bool) {
        this.debug = bool
    }

    setEmail(email) {
        this.userData.email = email
    }

    setPassword(password) {
        this.userData.password = password
    }

    setCharName(charName) {
        this.userData.charName = charName
    }

    // Methods
    speak(txt, type) {
        const colors = {
            error: '\x1b[31m',    // Red
            log: '\x1b[34m',      // Blue
            warning: '\x1b[33m',  // Yellow
            success: '\x1b[32m',  // Green
            info: '\x1b[36m'      // Cyan
        }

        const statuses = {
            error: 'Erro',
            log: 'Log',
            warning: 'Aviso',
            success: 'Passou',
            info: 'Info'
        }

        if (this.debug) {
            console.log(`${colors[type]}[  ${statuses[type]}  ]\x1b[0m ${txt}`)
        }
    }

    async start() {
        this.speak('Iniciando Tibia.js', 'info')
        const prompt = promptSync()
        const loginPage = await this.#loginPage()

        if (loginPage) {
            this.speak(`Pagina de login carregada com sucesso`, 'success')

            const userPage = await this.#accountPage(this.userData.email, this.userData.password)
            let pinned = true
            let tryr = 0

            if (userPage) {
                // verify if have pin ou invalid login ou passthoug to welcome page
                let email = this.userData.email
                let password = this.userData.password
                let currentUserPage = userPage
                let havePin = this.havePin(currentUserPage)

                while (pinned) {
                    this.speak(havePin, 'log')

                    if (havePin === 'welcome') {
                        pinned = false
                    } else if (havePin === 'login') {
                        email = prompt('Insira seu Email: ').trim()
                        password = prompt('Insira sua Senha: ').trim()

                        this.setEmail(email)
                        this.setPassword(password)

                        currentUserPage = await this.#accountPage(email, password)
                        havePin = this.havePin(currentUserPage)

                        if (havePin === 'login') {
                            tryr++
                            this.speak(`Email ou senha inválidos! Tentativa ${tryr}/3`, 'error')
                            pinned = true
                        } else {
                            pinned = false
                        }

                    } else if (havePin === 'PIN') {

                        currentUserPage = await this.#accountPage(email, password)
                        havePin = this.havePin(currentUserPage)

                        if (havePin === 'PIN') {
                            tryr++
                            this.speak(`PIN Incorreto! ${tryr}/3`, 'error')
                            pinned = true
                        } else {
                            pinned = false
                        }
                    } else if (havePin === 'IP') {
                        this.speak('Login bloqueado por muitas tentativas falhas. Tente novamente mais tarde.', 'error')
                        break
                    } else {
                        pinned = false
                        break
                    }

                    if (tryr > 2) {
                        this.speak('Número máximo de tentativas atingido. Saindo...', 'error')
                        break
                    }
                }

                let charChoose
                const charAvailable = this.#scrapChars(currentUserPage)

                if (!this.userData.charName) {

                    console.clear()

                    this.showCharactersList(charAvailable)

                    this.speak('Escolha um dos Personagens disponíveis na conta:', 'warning')

                    const maxChoice = charAvailable.length

                    const { choice } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'choice',
                            message: 'Digite o número do personagem escolhido:',
                            choices: charAvailable.map((char, idx) => ({
                                name: `${idx + 1}. ${char.name}`,
                                value: idx + 1
                            }))
                        }
                    ])

                    while (true) {
                        if (choice > maxChoice) {
                            this.speak('Escolha novamente, personagem não disponível!', "error")
                            choice = prompt('Digite o número do personagem escolhido: ').trim()

                        } else if (maxChoice === 1) {
                            charChoose = charAvailable[0].name

                            this.speak(`Personagem escolhido: ${charChoose}`, "success")
                            break
                        } else {
                            charChoose = charAvailable[choice - 1].name
                            break
                        }
                    }

                }

                this.speak(charChoose, 'log')
                const characterName = this.userData.charName || charChoose
                let charStatus = await this.#getCharStatus(characterName)

                if (Array.isArray(charStatus) && charStatus.length > 0) {
                    console.log(`\n\x1b[1m\x1b[385208m===== HISTÓRICO DE MORTES DE ${characterName} =====\x1b[0m\n`)
                    charStatus.forEach((death, index) => {
                        console.log(
                            `\x1b[385196m#${index + 1}\x1b[0m ` +
                            `\x1b[1mData:\x1b[0m \x1b[38545m${death.date}\x1b[0m\n` +
                            `\x1b[1mDescrição:\x1b[0m \x1b[385220m${death.description}\x1b[0m\n` +
                            `\x1b[1mPenalidade:\x1b[0m \x1b[385208m${death.penalty}\x1b[0m\n`
                        )
                        console.log('\x1b[385240m----------------------------------------\x1b[0m')
                    })
                    console.log('\x1b[1m\x1b[385208m===== FIM DO HISTÓRICO =====\x1b[0m\n')
                } else {
                    console.log('\x1b[1m\x1b[38540mNenhuma morte registrada para este personagem.\x1b[0m\n')
                }

                // Watch the character's deaths
                if (charStatus) {
                    const observerQuestion = [
                        {
                            type: 'list',
                            name: 'observer',
                            message: 'Deseja manter vigilância nas mortes do personagem?',
                            choices: [
                                { name: 'Sim', value: 's' },
                                { name: 'Não', value: 'n' }
                            ]
                        }
                    ]

                    const { observer } = await inquirer.prompt(observerQuestion)
                    if (observer === 's') {
                        let running = true

                        console.clear()

                        // LAST CHARACTER`S DEATH
                        const intervalId = setInterval(async () => {
                            if (!running) return
                            const newStatus = await this.#getCharStatus(characterName)
                            const totalMortes = Array.isArray(newStatus) ? newStatus.length : 0

                            const lastDeath = Array.isArray(newStatus) && newStatus.length > 0 ? newStatus[0] : null

                            let isNewDeath = false

                            if (lastDeath && lastDeath.date) {
                                const month = {
                                    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                                    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
                                }

                                const actualDateDeath = lastDeath.date
                                const deathSplit = actualDateDeath.split(' ')
                                const d = parseInt(deathSplit[1])
                                const m = month[deathSplit[0]]
                                const y = parseInt(deathSplit[2])
                                
                                const today = new Date()

                                isNewDeath =
                                    d === today.getDate() &&
                                    m === today.getMonth() &&
                                    y === today.getFullYear()
                            }
                            
                            console.clear()
                            console.log('\x1b[1m\x1b[38545m╔══════════════════════════════════════════════════════════╗\x1b[0m')
                            console.log(`\x1b[1m\x1b[385220m│ Personagem:\x1b[0m \x1b[38539m${characterName}\x1b[0m`)
                            console.log(`\x1b[1m\x1b[385220m│ Mortes registradas:\x1b[0m \x1b[385196m${totalMortes}\x1b[0m`)
                            console.log('\x1b[1m\x1b[38545m╠══════════════════════════════════════════════════════════╣\x1b[0m')
                            if (lastDeath) {
                                if (isNewDeath) {
                                    const warningMsg = '⚠️  NOVA MORTE DETECTADA! ⚠️'
                                    const totalWidth = 58
                                    const padLength = Math.floor((totalWidth - warningMsg.length) / 2)
                                    const paddedMsg = '│' + ' '.repeat(padLength) + '\x1b[1m\x1b[385196m' + warningMsg + '\x1b[0m' + ' '.repeat(totalWidth - warningMsg.length - padLength) + '│'
                                    console.log(paddedMsg)
                                }
                                
                                console.log(`\x1b[1m\x1b[385208m│ Última Morte:\x1b[0m`)
                                console.log(`\x1b[1m\x1b[385220m│   • Data:\x1b[0m \x1b[38545m${lastDeath.date || 'Data não encontrada'}\x1b[0m`)
                                console.log(`\x1b[1m\x1b[385220m│   • Descrição:\x1b[0m \x1b[385220m${lastDeath.description || 'Descrição não encontrada'}\x1b[0m`)
                                console.log(`\x1b[1m\x1b[385220m│   • Penalidade:\x1b[0m \x1b[385208m${lastDeath.penalty || 'Penalidade não encontrada'}\x1b[0m`)
                            } else {
                                console.log('\x1b[1m\x1b[38540m│ Nenhuma morte registrada para este personagem\x1b[0m')
                            }
                            console.log('\x1b[1m\x1b[38545m╚══════════════════════════════════════════════════════════╝\x1b[0m')
                        }, 5000)

                    } else if ("n") {
                        if (charAvailable.length > 1) {
                            this.speak("\nDeseja verificar o outro Personagem antes de finalizar?", 'warning')
                            const { choice } = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'choice',
                                    message: "Selecione uma opção:",
                                    choices: [
                                        { name: 'Sim', value: 's' },
                                        { name: 'Não', value: 'n' }
                                    ]
                                }
                            ])

                            if (choice === 'n') {
                                this.speak("Finalizando aplicação...", 'info')
                                process.exit(0)
                            }

                            this.showCharactersList(charAvailable)
                            const { person } = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'person',
                                message: 'Digite o número do personagem escolhido:',
                                choices: charAvailable.map((char, idx) => ({
                                    name: `${idx + 1}. ${char.name}`,
                                    value: char.name
                                }))
                            }
                            ])

                            const charStatus = await this.#getCharStatus(person)

                            if (Array.isArray(charStatus) && charStatus.length > 0) {
                                console.log('\x1b[1m\x1b[38551m╔══════════════════════════════════════════════════════════════════════════╗\x1b[0m')
                                console.log(`\x1b[1m\x1b[38551m│ 🚀  DEATH LOG - ${person}  [${charStatus.length} deaths]  🚀\x1b[0m`)
                                console.log('\x1b[1m\x1b[38551m╠══════════════════════════════════════════════════════════════════════════╣\x1b[0m')
                                charStatus.forEach((death, idx) => {
                                    console.log(`\x1b[385208m│ #${idx + 1} \x1b[0m\x1b[38545m🕒 ${death.date}\x1b[0m`)
                                    console.log(`\x1b[385220m│    💀 Description: \x1b[0m\x1b[38539m${death.description}\x1b[0m`)
                                    console.log(`\x1b[385208m│    ⚠️ Penalty: \x1b[0m\x1b[385196m${death.penalty}\x1b[0m`)
                                    console.log('\x1b[385240m│ ---------------------------------------------------------------------- │\x1b[0m')
                                })
                                console.log('\x1b[1m\x1b[38551m╚══════════════════════════════════════════════════════════════════════════╝\x1b[0m')
                            } else {
                                console.log('\x1b[1m\x1b[38540mNenhuma morte registrada para este personagem.\x1b[0m\n')
                            }
                        }
                    }
                }
            } else {
                this.speak('Falha ao carregar a página da conta.', 'error')
            }
        } else {
            this.speak('Falha ao carregar a página de login.', 'error')
        }
    }

    /**
     * Exibe uma lista formatada de personagens Tibia no console com saída colorida.
     *
     * @param {Array<Object>} list - Um array de objetos de personagens para exibir.
     */
    showCharactersList(list) {
        list.forEach((ele, idx) => {
            console.log(
                `\x1b[1m\x1b[38545m┌───────────────────────────────────────────────┐\x1b[0m`
            )
            console.log(
                `\x1b[1m\x1b[385208m│ ${idx + 1}.\n| Nome:\x1b[0m \x1b[385220m${ele.name}\x1b[0m`
            )
            console.log(
                `\x1b[1m\x1b[385208m│ Vocação:\x1b[0m \x1b[38545m${ele.vocation}\x1b[0m`
            )
            console.log(
                `\x1b[1m\x1b[385208m│ Level:\x1b[0m \x1b[38540m${ele.level}\x1b[0m`
            )
            console.log(
                `\x1b[1m\x1b[385208m│ Mundo:\x1b[0m \x1b[38539m${ele.world}\x1b[0m`
            )
            console.log(
                `\x1b[1m\x1b[38545m└───────────────────────────────────────────────┘\x1b[0m\n`
            )
        })
    }

    /**
     * Inicia o processo de login enviando uma requisição GET para a página de conta do Tibia.
     * Se as credenciais do usuário estiverem disponíveis, tenta buscar a página da conta usando headers personalizados.
     * Em caso de sucesso, salva o HTML da resposta em 'account.html' e retorna os dados HTML.
     * Em caso de falha, registra uma mensagem de erro.
     *
     * @private
     * @async
     * @returns {Promise<string|undefined>} O conteúdo HTML da página da conta, ou undefined se ocorrer um erro.
     */
    async #loginPage() {
        this.speak('Iniciando login...', 'info')

        if (this.userData.email && this.userData.password) {
            try {
                const response = await this.client.get('https://www.tibia.com/account/', {
                    headers: {
                        'accept': 'text/html,application/xhtml+xml,application/xmlq=0.9,image/avif,image/webp,image/apng,*/*q=0.8',
                        'accept-language': 'pt-BR,ptq=0.5',
                        'priority': 'u=0, i',
                        'sec-ch-ua': '"NotA=Brand"v="99", "Brave"v="139", "Chromium"v="139"',
                        'sec-ch-ua-arch': '""',
                        'sec-ch-ua-bitness': '"64"',
                        'sec-ch-ua-full-version-list': '"NotA=Brand"v="99.0.0.0", "Brave"v="139.0.0.0", "Chromium"v="139.0.0.0"',
                        'sec-ch-ua-mobile': '?1',
                        'sec-ch-ua-model': '"Nexus 5"',
                        'sec-ch-ua-platform': '"Android"',
                        'sec-ch-ua-platform-version': '"6.0"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'none',
                        'sec-fetch-user': '?1',
                        'sec-gpc': '1',
                        'upgrade-insecure-requests': '1',
                        'user-agent': 'Mozilla/5.0 (Linux Android 6.0 Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                    }
                })
                save(response.data, 'account.html')
                return response.data
            } catch (error) {
                this.speak(`Erro ao fazer login: ${error.message}`, 'error')
                return
            }
        }
    }

    /**
     * Carrega a página inicial da conta do usuário autenticado
     * @param {string} email - E-mail da conta Tibia
     * @param {string} password - Senha da conta Tibia
     * @returns {Promise<string|undefined>} Conteúdo HTML da página da conta ou undefined em caso de erro
     * @throws {Error} Erro durante a requisição HTTP
     * @description
     * Esta função realiza uma requisição POST para a página de autenticação do Tibia
     * utilizando as credenciais fornecidas. Em caso de sucesso, o HTML da página
     * de overview da conta é retornado e salvo localmente para análise.
     * 
     * O método utiliza headers específicos para simular um navegador móvel e
     * contornar possíveis restrições de segurança.
     * 
     * @example
     * const accountHtml = await tibia.#accountPage('user@email.com', 'password123')
     * if (accountHtml) {
     *   // Processar HTML da conta
     * }
     */
    async #accountPage(email, password) {
        this.speak('Carregando página inicial da conta...', 'info')
        try {
            const response = await this.client.post(
                'https://www.tibia.com/account/', `loginemail=${email}&loginpassword=${password}&page=overview`,
                {
                    headers: {
                        'accept': 'text/html,application/xhtml+xml,application/xmlq=0.9,image/avif,image/webp,image/apng,*/*q=0.8',
                        'accept-language': 'pt-BR,ptq=0.5',
                        'cache-control': 'max-age=0',
                        'origin': 'https://www.tibia.com',
                        'priority': 'u=0, i',
                        'referer': 'https://www.tibia.com/account/?subtopic=accountmanagement',
                        'sec-ch-ua': '"NotA=Brand"v="99", "Brave"v="139", "Chromium"v="139"',
                        'sec-ch-ua-arch': '""',
                        'sec-ch-ua-bitness': '"64"',
                        'sec-ch-ua-full-version-list': '"NotA=Brand"v="99.0.0.0", "Brave"v="139.0.0.0", "Chromium"v="139.0.0.0"',
                        'sec-ch-ua-mobile': '?1',
                        'sec-ch-ua-model': '"Nexus 5"',
                        'sec-ch-ua-platform': '"Android"',
                        'sec-ch-ua-platform-version': '"6.0"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-user': '?1',
                        'sec-gpc': '1',
                        'upgrade-insecure-requests': '1',
                        'user-agent': 'Mozilla/5.0 (Linux Android 6.0 Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                    }
                }
            )

            save(response.data, 'account_overview.html')

            return response.data

        } catch (error) {
            this.speak(`Erro ao carregar a página da conta: ${error.message}`, 'error')
            return
        }
    }


    /**
     * Verifica o status da conta a partir do HTML fornecido.
     *
     * Este método analisa o HTML para detectar se a conta está logada com sucesso,
     * se requer PIN, se as credenciais são inválidas ou se está bloqueada por restrições de IP.
     *
     * @param {string} data - O conteúdo HTML da página da conta.
     * @returns {'welcome' | 'IP' | 'login' | 'PIN'} - O status da conta:
     *   - 'welcome': Conta conectada com sucesso.
     *   - 'IP': Conta bloqueada por restrições de IP.
     *   - 'login': Email ou senha inválidos.
     *   - 'PIN': Código PIN é necessário.
     */
    havePin(data) {
        this.speak('Verificando se a conta possui PIN...', 'info')
        const $ = cheerio.load(data)

        let isWelcome = false

        $('table td').each((i, elem) => {
            if ($(elem).text().includes('Welcome to your account!')) {
                isWelcome = true
                return false
            }
        })

        if (isWelcome) {
            this.speak('A conta conectou com sucesso!', 'success')
            return 'welcome'
        }

        const attention = $('.AttentionSign')

        if (attention.length > 0) {
            const errorText = attention.parent().text()
            if (errorText.toLowerCase().includes('ip')) {
                return "IP"
            }
        }

        if ($('input[type="password"]').length > 0 || $('form[action*="login"]').length > 0) {
            this.speak('Email ou senha invalidos!', 'warning')
            return 'login'
        }

        this.speak('Necessário código PIN.', 'warning')
        return 'PIN'
    }

    /**
     * @param {HTML} data pagina da conta onde tenha a lista de personagens
     * @description Procura todos os personagens disponíveis na conta e retorna uma lista com os nomes
     * @returns {Array} lista de personagens disponíveis na conta
     */
    #scrapChars(data) {
        this.speak('Verificando personagens disponíveis na conta...', 'warning')
        let list = []
        const $ = cheerio.load(data)

        const nomes = []
        $('[id^="CharacterNameOf_"]').each((_, elem) => {
            nomes.push($(elem).text().trim())
        })

        for (let i = 0; i < nomes.length; i += 2) {
            const name = nomes[i]
            const details = nomes[i + 1] || ''

            const regex = /^(.*?)\s*-\s*Level\s*(\d+)\s*-\s*On\s*(.+)$/
            let vocation = '', level = '', world = ''

            const match = details.match(regex)
            if (match) {
                vocation = match[1].trim()
                level = parseInt(match[2])
                world = match[3].trim()
            }

            list.push({
                name,
                vocation,
                level,
                world
            })
        }
        return list
    }

    /**
     * 
     * @param {string} name Nome do personagem  
     * @returns {Array<object> || Promise} Lista de mortes do personagem
     * @description 
     * Busca as informações de mortes do personagem na página de gerenciamento de conta
     * e retorna uma lista com os detalhes de cada morte registrada.
     */
    async #getCharStatus(name) {
        try {
            this.speak(`Carregando informações do personagem ${name}...`, 'info')

            const response = await this.client.get('https://www.tibia.com/account/', {
                params: {
                    'subtopic': 'accountmanagement',
                    'page': 'changecharacterinformation',
                    'countryid': '',
                    'name': name
                },
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xmlq=0.9,image/avif,image/webp,image/apng,*/*q=0.8',
                    'accept-language': 'pt-BR,ptq=0.5',
                    'priority': 'u=0, i',
                    'referer': 'https://www.tibia.com/account/?subtopic=accountmanagement',
                    'sec-ch-ua': '"NotA=Brand"v="99", "Brave"v="139", "Chromium"v="139"',
                    'sec-ch-ua-arch': '""',
                    'sec-ch-ua-bitness': '"64"',
                    'sec-ch-ua-full-version-list': '"NotA=Brand"v="99.0.0.0", "Brave"v="139.0.0.0", "Chromium"v="139.0.0.0"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-model': '"Nexus 5"',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-ch-ua-platform-version': '"6.0"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'sec-gpc': '1',
                    'upgrade-insecure-requests': '1',
                    'user-agent': 'Mozilla/5.0 (Linux Android 6.0 Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                }
            })

            const $ = cheerio.load(response.data)
            const findDeaths = $('body').text().toLowerCase().includes("character deaths")
            const deaths = []

            if (findDeaths) {
                $('table.TableContent').each((idx, death) => {
                    $(death).find('tr').slice(1).each((i, row) => {
                        const cols = $(row).find('td')
                        if (cols.length === 3) {
                            deaths.push({
                                date: $(cols[0]).text().replace(/\u00a0/g, ' ').trim(),
                                description: $(cols[1]).text().trim(),
                                penalty: $(cols[2]).text().trim()
                            })
                        }
                    })
                })

                return deaths
            } else {
                this.speak(`Caracter ${name} não possui mortes registradas.`, 'warning')
                return []
            }

            save(response.data, 'character_info.html')
        } catch (error) {
            this.speak(`getCharStatus: ${error}`, 'error')
        }
    }
}

export default Tibia
