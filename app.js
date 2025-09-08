import Tibia from './app/Tibia.js';
import inquirer from 'inquirer';

console.clear()

console.log(`
\x1b[34m
 _______ _ _        __        __        _       _     
|__   __(_) |       \\ \\      / /       | |     | |    
   | |   _| |__  ____ \\ \\ /\\ / /__  __ _| |_ ___| |__  
   | |  | | '_ \\( ) / _ \\ \\ V  V / _ \\/ _\` | __/ __| '_ \\ 
   | |  | | |_)  | | __/  \\_/\\_/  __/ (_| | || (__| | | |
   |_|  |_|_.__/  \\___|         |_|   \\__,_|\\__\\___|_| |_|
                 T i b i a W a t c h
\x1b[0m
`);

console.log(`
\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Para acessar seus status, precisamos do seu email e senha.
🌐 Este projeto é open source! Confira o código no GitHub:
    https://github.com/seu-repositorio/tibia-watch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
`)

const perguntas = [
    { type: 'input', name: 'email', message: 'Informe seu email:' },
    { type: 'password', name: 'password', message: 'Informe sua senha:' },
    { type: 'input', name: 'charName', message: 'Informe o nome do personagem (deixe vazio para listar os personagens):' },
    {
        type: 'list',
        name: 'opcao',
        message: '*************** AGORA SELECIONE UMA OPÇÃO ***************',
        choices: [
            'Conferir quantidade de mortes',
            'Ver status da conta',
            'Conferir se o personagem está online'
        ]
    }
];

const respostas = await inquirer.prompt(perguntas);

console.clear();
console.log('Você escolheu:', respostas);

const tibia = new Tibia()

tibia.setSpeak(true)
tibia.setEmail(respostas.email)
tibia.setPassword(respostas.password)
tibia.setCharName(respostas.charName) // caso seja null ou "" ele lista os personagens e pede para escolher ou seja esta funcao é opcional
tibia.start()