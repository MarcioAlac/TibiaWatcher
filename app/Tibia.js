import axios from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import save from './func/data.js'
import * as cheerio from 'cheerio'
import promptSync from 'prompt-sync'

class Tibia {
    constructor() {
        console.clear()

        this.userData = {}
        this.jar = new CookieJar()
        this.client = wrapper(axios.create({ jar: this.jar }))
        this.debug = false
    }

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

                let charChoose = ""

                if (!this.userData.charName) {
                    const charAvailable = this.#scrapChars(currentUserPage)
                    this.speak('Escolha um dos Personagens disponíveis na conta:', 'warning')

                    const maxChoice = charAvailable.length
                    let choice = prompt('Digite o número do personagem escolhido: ').trim()

                    while (true) {
                        if (choice > maxChoice) {
                            this.speak('Escolha novamente, personagem não disponível!', "error")
                            choice = prompt('Digite o número do personagem escolhido: ').trim()

                        } else if (maxChoice === 1) {
                            charChoose = charAvailable[0].name

                            this.speak(`Personagem escolhido: ${charChoose}`, "success")
                            break
                        } else {
                            break
                        }
                    }

                }

                const characterName = this.userData.charName || charChoose;
                let charStatus = await this.#getCharStatus(characterName)
                const charStatusJn = charStatus ? JSON.stringify(charStatus, null, 2) : null
                const primeiraMorte = Array.isArray(charStatus) && charStatus.length > 0 ? charStatus[0] : null;
                if (charStatus) {
                    let observer = prompt("[  warning  ] Deseja manter vigilancia nas mortes do personagem? (s/n): ").trim().toLowerCase()
                    if (observer === 's') {
                        let running = true;
                        const intervalId = setInterval(async () => {
                            if (!running) return;
                            const newStatus     = await this.#getCharStatus(characterName);
                            const totalMortes   = Array.isArray(newStatus) ? newStatus.length : 0;
                            console.clear()
                            this.speak(`Status do personagem Nome: ${characterName} | Número de mortes: ${totalMortes}\nUltima Morte: \nDia: ${charStatus[0].date}\nDescricã̀o: ${charStatus[0].description}\nPenalidade: ${charStatus[0].penalty}`, 'warning')
                        }, 10000);
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
     * 
     * @returns {Promise<string|undefined>} response data or undefined
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
     * const accountHtml = await tibia.#accountPage('user@email.com', 'password123');
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
     * Returns if account request a PIN to connect or invalid login
     * @data {*} 
     * @param {*} data 
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
        this.speak('Verificando personagens disponíveis na conta...', 'warning');
        let list = [];
        const $ = cheerio.load(data);

        $("[id^='CharacterRow_']").each((idx, elem) => {
            let rawText = $(elem).text().replace(/\[Edit\]\s*\[Delete\]/g, '').trim();
            rawText = rawText.replace(/^\d+\.\s*/, '');

            const regex = /^(.*)\s+([A-Za-z ]+)\s*-\s*Level\s*(\d+)\s*-\s*On\s*(.+)$/;
            const match = rawText.match(regex);
            let name = '', vocation = '', level = 0, world = '';
            if (match) {
                const completeName = match[1].trim();
                const vocationFinder = match[2].trim();
                name = completeName;
                vocation = vocationFinder;
                level = parseInt(match[3]);
                world = match[4].trim();
            } else {
                name = rawText;
            }
            list.push({
                name: name,
                vocation,
                level,
                world
            });
            this.speak(`${idx + 1} - ${name} | Vocação: ${vocation} | Level: ${level} | Mundo: ${world}`, 'info');
        });

        return list;
    }

    /**
     * 
     * @param {string} name Nome do personagem  
     * @returns {Array<object>} Lista de mortes do personagem
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
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'accept-language': 'pt-BR,pt;q=0.5',
                    'priority': 'u=0, i',
                    'referer': 'https://www.tibia.com/account/?subtopic=accountmanagement',
                    'sec-ch-ua': '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
                    'sec-ch-ua-arch': '""',
                    'sec-ch-ua-bitness': '"64"',
                    'sec-ch-ua-full-version-list': '"Not;A=Brand";v="99.0.0.0", "Brave";v="139.0.0.0", "Chromium";v="139.0.0.0"',
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
                    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                }
            });

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