# OpenRouter Chat

Chat web leve para conversar com modelos da [OpenRouter](https://openrouter.ai) direto no navegador. Funciona como um site estático — sem backend, sem build, sem instalação. Tudo roda no client usando as APIs públicas da OpenRouter.

---

## 📑 Índice

- [Funcionalidades](#-funcionalidades)
- [Estrutura de arquivos](#-estrutura-de-arquivos)
- [Como usar](#-como-usar)
- [Arquivos suportados](#-arquivos-suportados)
- [Dependências](#-dependências)
- [Personalização](#-personalização)
- [Privacidade e segurança](#-privacidade-e-segurança)
- [Hospedagem](#-hospedagem)
- [Solução de problemas](#-solução-de-problemas)
- [Limitações](#-limitações)
- [Licença](#-licença)

---

## ✨ Funcionalidades

### Chat
- **Múltiplas conversas** salvas automaticamente no navegador
- **Criar, alternar e apagar** conversas pelo menu lateral
- **Título automático** gerado a partir da primeira mensagem
- **Saudação dinâmica** conforme o horário (bom dia / boa tarde / boa noite)
- **Enter envia**, `Shift + Enter` quebra linha

### Renderização
- **Markdown completo** (títulos, listas, tabelas, citações, links, imagens)
- **Realce de sintaxe** em blocos de código (highlight.js)
- **Botão "Copiar"** em cada bloco de código
- **Fórmulas matemáticas** com KaTeX — inline `$...$` e bloco `$$...$$`

### Modelos
- **Roteador automático** de modelos gratuitos (`openrouter/free`)
- **Filtro "apenas gratuitos"** ativado por padrão
- **Lista completa** de modelos carregada da API da OpenRouter
- **Seleção persistente** do último modelo usado

### Arquivos
- Upload de **imagens, vídeos, áudios**
- Leitura de **PDF, DOCX, XLSX**
- Descompactação de **ZIP** (detecta projetos MicroStudio e Godot)
- Leitura de **arquivos de código e texto** (mais de 60 extensões)
- Pré-visualização em chips removíveis antes do envio

### Estatísticas
- Requisições totais
- Tokens de entrada / saída / total
- Custo acumulado (quando informado pela API)
- Ranking de modelos mais usados
- Botão para zerar tudo

### Interface
- Tema escuro moderno
- **Responsiva** — funciona em desktop e mobile
- Drawer lateral para conversas
- Painel lateral de configurações
- Animações suaves

---

## 📁 Estrutura de arquivos

```
.
├── index.html    # Estrutura da página (header, drawer, chat, configurações)
├── style.css     # Estilos e tema visual
└── script.js     # Lógica: chat, arquivos, API, persistência, estatísticas
```

---

## 🎨 Personalização

O tema é controlado por variáveis CSS em `style.css`:

```css
:root {
  --bg: #0a0b0f;         /* fundo principal */
  --bg-2: #12141a;       /* topbar, composer */
  --bg-3: #1a1d26;       /* inputs, chips */
  --bg-4: #232730;       /* hover */
  --border: #262a35;     /* bordas */
  --text: #e6e8ee;       /* texto principal */
  --muted: #8a90a2;      /* texto secundário */
  --accent: #4d7cfe;     /* azul de destaque */
  --accent-2: #3a6ae8;   /* azul hover */
  --user: #1f3a6e;       /* bolha do usuário */
  --bot: #14171e;        /* bolha do bot */
  --danger: #e5484d;     /* erros */
  --code-bg: #0d1117;    /* fundo de código */
}
```

Os limites de tamanho de arquivo são configuráveis no topo de `script.js`:

```js
var MAX_TEXT_SIZE  = 500000;    // 500 KB para texto/código
var MAX_MEDIA_SIZE = 15000000;  // 15 MB para vídeo/áudio
var MAX_ZIP_SIZE   = 25000000;  // 25 MB para ZIP
var MAX_CHARS      = 200000;    // limite de caracteres extraídos de ZIP
```

O estado global do app fica em `script.js`:

```js
var state = {
  apiKey: "",
  userName: "",
  model: "openrouter/free",
  onlyFree: true,
  chats: [],
  currentChatId: null,
  attachments: [],
  stats: { reqs: 0, tokensIn: 0, tokensOut: 0, total: 0, cost: 0, models: {} },
  loading: false,
  allModels: []
};
```

---

## 📦 Arquivos suportados

| Categoria | Extensões | Limite |
|---|---|---|
| Imagens | png, jpg, jpeg, gif, webp, bmp, svg | sem limite fixo |
| Vídeos | mp4, webm, mov, avi, mkv | 15 MB |
| Áudios | mp3, wav, ogg, m4a, flac | 15 MB |
| Documentos | pdf, docx, doc, xlsx, xls, pptx | — |
| Texto / Código | txt, md, json, csv, xml, yaml, yml, html, css, js, ts, py, java, c, cpp, cs, rb, php, go, rs, sh, sql, kt, swift, lua, r, pl, vue, svelte, dart, scala e outras | 500 KB |
| Projetos ZIP | .zip (MicroStudio, Godot e projetos gerais) | 25 MB |

---

## 🧩 Dependências

Todas via CDN — não há `package.json`, `node_modules` nem etapa de build.

| Biblioteca | Versão | Uso |
|---|---|---|
| marked | 9.1.6 | Renderização de Markdown |
| highlight.js | 11.9.0 | Realce de sintaxe |
| KaTeX | 0.16.9 | Fórmulas matemáticas |
| pdf.js | 3.11.174 | Leitura de PDF |
| mammoth.js | 1.6.0 | Leitura de DOCX |
| SheetJS (xlsx) | 0.18.5 | Leitura de XLSX |
| JSZip | 3.10.1 | Descompactação de ZIP |

É HTML, CSS e JS puros.

---

## 🚀 Como usar

### 1. Obter uma API Key da OpenRouter

1. Acesse [openrouter.ai](https://openrouter.ai)
2. Crie uma conta (Google, GitHub ou e-mail)
3. Vá em **Keys** → **Create Key**
4. Copie a chave — ela começa com `sk-or-v1-...`
5. Guarde em local seguro; ela só é mostrada uma vez

> Modelos gratuitos não exigem crédito, mas a conta precisa ter a chave criada. Alguns modelos pagos podem exigir saldo.

### 2. Rodar o projeto

**Opção A — Abrir direto no navegador**

Baixe os 3 arquivos (`index.html`, `style.css`, `script.js`) na mesma pasta e dê duplo clique no `index.html`.

**Opção B — Servidor local (recomendado)**

Alguns navegadores bloqueiam requisições feitas de `file://`. Use um servidor simples:

```bash
# Python 3
python3 -m http.server 8000

# Node.js (se tiver o pacote http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Depois acesse `http://localhost:8000`.

### 3. Configurar

1. Clique no ícone de engrenagem (⚙️) para abrir as **Configurações**
2. Cole sua API Key e clique em **Salvar**
3. (Opcional) informe seu nome
4. Clique em **Carregar modelos**
5. Escolha um modelo ou mantenha **"Apenas modelos gratuitos"** marcado
6. Feche o painel e comece a conversar

---

## 🔒 Privacidade e segurança

- Não há servidor próprio: todo o tráfego vai direto do navegador para `openrouter.ai`.
- A **API Key fica salva no `localStorage`** do navegador — nunca é enviada para nenhum lugar além da OpenRouter.
- Conversas, estatísticas e configurações também ficam apenas no `localStorage` local (nada é sincronizado ou enviado a terceiros).
- Limpar o cache/dados do site apaga tudo: conversas, chave e estatísticas.
- **Não use em computadores compartilhados/públicos** sem apagar os dados depois, pois a chave fica salva em texto no navegador.

### Chaves usadas no `localStorage`

| Chave | Conteúdo |
|---|---|
| `or_chats` | Histórico de conversas |
| `or_currentChatId` | ID da conversa ativa |
| `or_apiKey` | API Key da OpenRouter |
| `or_userName` | Nome do usuário |
| `or_model` | Modelo selecionado |
| `or_onlyFree` | Filtro de modelos gratuitos |
| `or_stats` | Estatísticas de uso |

---

## 🌐 Hospedagem

Por ser um site 100% estático, pode ser hospedado gratuitamente em:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Qualquer servidor HTTP simples

Basta subir os 3 arquivos — não há variáveis de ambiente nem configuração de servidor.

---

## 🛠 Solução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| "Erro na requisição" / 401 | API Key inválida ou ausente | Verifique a chave nas Configurações |
| Modelos não carregam | Bloqueio de rede/CORS ou API fora do ar | Clique novamente em "Carregar modelos" ou verifique sua conexão |
| Arquivo não é lido | Extensão não suportada ou acima do limite de tamanho | Veja a tabela de [Arquivos suportados](#-arquivos-suportados) |
| Nada salva entre sessões | Navegador em modo anônimo/privado, ou cookies/storage bloqueados | Use uma janela normal e permita armazenamento local para o site |
| PDF/DOCX/XLSX não abre | Falha ao carregar a lib via CDN | Verifique conexão com a internet (bibliotecas vêm de CDN externo) |

---

## ⚠️ Limitações

- Não há autenticação de usuários nem multiusuário — é uma ferramenta pessoal, local ao navegador.
- Sem sincronização entre dispositivos (tudo fica no `localStorage` de cada navegador).
- Depende de conexão com a internet tanto para a API da OpenRouter quanto para as bibliotecas via CDN.
- Custo e limites de uso dependem inteiramente da conta e do plano na OpenRouter.

---

## 📄 Licença

MIT
