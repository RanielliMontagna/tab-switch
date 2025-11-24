<div align='center'>
    <img src='public/logo.png' alt='Tab Switch Logo' width='80'  />
    <h2 align='center' style={{margin: 0}}>Tab Switch</h2>
</div>

## 📖 Sobre o projeto

Tab Switch é uma extensão de navegador que permite a rotação automática entre abas abertas, fechando outras abas não configuradas. Ideal para apresentações, monitoramento de dashboards e outras situações onde a rotação de abas é necessária.

## 🛠️ Funcionalidades

- [x] Configuração de tempo de rotação entre abas
- [x] Configuração de abas a serem exibidas
- [x] Importação e exportação de configurações de abas

## 📸 Screenshot

![Screenshot 1](./public/screenshot.png) 

## 🚀 Tecnologias Utilizadas

- [React](https://reactjs.org/) - Biblioteca JavaScript para criar interfaces de usuário
- [TypeScript](https://www.typescriptlang.org/) - Superset JavaScript
- [Vite](https://vitejs.dev/) - Build tool para aplicações web modernas
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário de baixo nível para construir designs personalizados
- [Lucide Icons](https://lucide.dev/) - Conjunto de ícones para projetos web
- [Biome](https://biomejs.dev/) - Linter e formatador de código rápido e unificado
- [Lefthook](https://github.com/evilmartians/lefthook) - Git hooks manager para garantir qualidade de código

## 📦 Instalação 

1. Clone o repositório:
    ```sh
    git clone git@github.com:RanielliMontagna/tab-switch.git
    cd tab-switch
    ```
2. Instale as dependências:
    ```sh
    pnpm install
    ```
3. Compile o projeto:
    ```sh
    pnpm build
    ```
4. (Opcional) Instale os git hooks para garantir qualidade de código:
    ```sh
    pnpm prepare
    ```
    Isso configurará o Lefthook para executar verificações automáticas antes de commits e pushes.
5. Adicione a extensão no Chrome:
    1. Abra o Chrome e vá para `chrome://extensions/`.
    2. Ative o "Modo do desenvolvedor" no canto superior direito.
    3. Clique em "Carregar sem compactação" e selecione a pasta `build` gerada pelo comando de build.

Agora a extensão está instalada e pronta para uso no Chrome.

## 🔧 Scripts Disponíveis

- `pnpm dev` - Inicia o servidor de desenvolvimento
- `pnpm build` - Compila o projeto para produção
- `pnpm check` - Executa verificação de lint e formatação (Biome)
- `pnpm check:fix` - Executa verificação e corrige automaticamente
- `pnpm lint` - Executa apenas o linter
- `pnpm format` - Formata o código

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.

---

#### 🖊️ Autor - [@raniellimontagna](https://www.github.com/raniellimontagna)