# Tibia Watcher

![Tibia Watcher Banner](https://raw.githubusercontent.com/MarcioAlac/TibiaWatcher/main/assets/banner.png)

<div align="center">
  <img src="https://img.shields.io/github/license/MarcioAlac/TibiaWatcher?style=for-the-badge" />
  <img src="https://img.shields.io/github/stars/MarcioAlac/TibiaWatcher?style=for-the-badge" />
  <img src="https://img.shields.io/github/issues/MarcioAlac/TibiaWatcher?style=for-the-badge" />
</div>

## 🚀 Sobre o projeto

**Tibia Watcher** é uma aplicação Node.js para automação e monitoramento de contas e personagens do Tibia via web scraping. Permite login, seleção de personagem, exibição de histórico de mortes e vigilância em tempo real, tudo pelo terminal com uma interface interativa e colorida.

---

## ✨ Funcionalidades

- Login automático simulando navegador mobile
- Listagem de personagens da conta
- Consulta de histórico de mortes do personagem
- Monitoramento em tempo real de novas mortes
- Cache inteligente para evitar requisições desnecessárias
- Interface elegante no terminal

---

## 🖥️ Demonstração

![Demo](https://raw.githubusercontent.com/MarcioAlac/TibiaWatcher/main/assets/demo.gif)

---

## ⚡ Instalação

```bash
# Clone o repositório
$ git clone https://github.com/MarcioAlac/TibiaWatcher.git
$ cd TibiaWatcher

# Instale as dependências
$ npm install
```

---

## 🔑 Configuração

Você pode informar email e senha via perguntas interativas ou definir variáveis de ambiente em um arquivo `.env`:

```env
EMAIL=seu@email.com
PASSWORD=suasenha
```

---

## 🕹️ Como usar

```bash
# Execute a aplicação
$ node app.js
```

---

## 📦 Dependências principais

- [axios](https://github.com/axios/axios)
- [cheerio](https://github.com/cheeriojs/cheerio)
- [inquirer](https://github.com/SBoudrias/Inquirer.js/)
- [nanospinner](https://github.com/usmanyunusov/nanospinner)
- [dotenv](https://github.com/motdotla/dotenv)

---

## 💡 Contribua

Pull requests são bem-vindos! Sinta-se livre para abrir issues e sugerir melhorias.

---

## 📄 Licença

Este projeto está sob licença MIT.

---

<div align="center">
  <sub>Feito com ❤️ por <a href="https://github.com/MarcioAlac">MarcioAlac</a></sub>
</div>
