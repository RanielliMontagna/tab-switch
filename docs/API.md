# API Documentation

Documentação das APIs internas e contratos de mensagens do Tab Switch.

## Índice

- [Mensagens entre Popup e Background](#mensagens-entre-popup-e-background)
- [Storage API](#storage-api)
- [Chrome API Utilities](#chrome-api-utilities)
- [Schemas de Validação](#schemas-de-validação)

## Mensagens entre Popup e Background

O popup e o background script se comunicam através de `chrome.runtime.sendMessage` e `chrome.runtime.onMessage`.

### Tipos de Mensagens

#### StartRotationMessage

Inicia a rotação de abas.

```typescript
interface StartRotationMessage {
  status: true
  tabs: TabSchema[]
}
```

**Resposta:**
```typescript
{
  status: 'Rotation started' | 'error'
  message?: string
  success: boolean
}
```

#### StopRotationMessage

Para a rotação de abas.

```typescript
interface StopRotationMessage {
  status: false
}
```

**Resposta:**
```typescript
{
  status: 'Rotation stopped'
  success: boolean
}
```

#### PauseRotationMessage

Pausa a rotação sem perder o estado atual.

```typescript
interface PauseRotationMessage {
  action: 'pause'
}
```

**Resposta:**
```typescript
{
  status: 'Rotation paused'
  success: boolean
}
```

#### ResumeRotationMessage

Retoma a rotação do ponto onde foi pausada.

```typescript
interface ResumeRotationMessage {
  action: 'resume'
}
```

**Resposta:**
```typescript
{
  status: 'Rotation resumed' | 'error'
  message?: string
  success: boolean
}
```

### Exemplo de Uso

```typescript
// Enviar mensagem do popup
const message: StartRotationMessage = {
  status: true,
  tabs: [
    { id: 1, name: 'Example', url: 'https://example.com', interval: 5000 }
  ]
}

chrome.runtime.sendMessage(message, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError)
    return
  }
  console.log('Response:', response)
})
```

## Storage API

### Chaves de Storage

```typescript
const STORAGE_KEYS = {
  TABS: 'tabs',           // Array de TabSchema
  SWITCH: 'switch',       // boolean - estado do switch
  IS_PAUSED: 'isPaused', // boolean - estado de pausa
  THEME: 'theme',         // 'light' | 'dark' | 'system'
  LANGUAGE: 'language',  // 'pt' | 'en'
} as const
```

### Funções Principais

#### `getStorageItem<T>(key: StorageKey): Promise<T | null>`

Obtém um item do storage com validação de tipo em runtime.

```typescript
const tabs = await getStorageItem<TabSchema[]>(STORAGE_KEYS.TABS)
```

#### `setStorageItem<T>(key: StorageKey, value: T): Promise<void>`

Salva um item no storage com validação.

```typescript
await setStorageItem(STORAGE_KEYS.TABS, tabs)
```

#### `getTabsWithMigration(): Promise<TabSchema[]>`

Obtém tabs do storage com migração automática e validação.

```typescript
const tabs = await getTabsWithMigration()
// Retorna tabs migrados e validados automaticamente
```

### Validação em Runtime

Todos os dados do storage são validados em runtime usando schemas Zod:

- `tabsStorageSchema` - Valida array de tabs
- `switchStorageSchema` - Valida estado do switch (boolean)
- `pauseStateStorageSchema` - Valida estado de pausa (boolean)
- `themeStorageSchema` - Valida tema ('light' | 'dark' | 'system')
- `languageStorageSchema` - Valida idioma ('pt' | 'en')
- `dataVersionStorageSchema` - Valida versão dos dados (number)

## Chrome API Utilities

Utilitários para tratamento consistente de erros da Chrome API.

### `getChromeRuntimeError(): string | null`

Verifica se há erro no `chrome.runtime.lastError`.

```typescript
const error = getChromeRuntimeError()
if (error) {
  console.error('Chrome API error:', error)
}
```

### `promisifyChromeApi<T>(chromeApiCall, errorMessage?): Promise<T>`

Converte uma chamada de API do Chrome baseada em callback para Promise.

```typescript
const tabs = await promisifyChromeApi<chrome.tabs.Tab[]>(
  (callback) => chrome.tabs.query({}, callback),
  'Failed to query tabs'
)
```

### `validateChromePermissions(permissions: string[]): void`

Valida que as permissões necessárias estão disponíveis.

```typescript
try {
  validateChromePermissions(['tabs', 'storage'])
} catch (error) {
  if (error instanceof ChromeApiError) {
    console.error('Missing permissions:', error.message)
  }
}
```

### `safeChromeOperation<T>(operation, errorMessage?): Promise<T | null>`

Executa uma operação do Chrome API com tratamento seguro de erros.

```typescript
const result = await safeChromeOperation(
  async () => {
    const tabs = await promisifyChromeApi(...)
    return tabs
  },
  'Failed to get tabs'
)
```

## Schemas de Validação

### TabSchema

```typescript
interface TabSchema {
  id: number              // ID único (número positivo)
  name: string           // Nome da aba (mínimo 1 caractere)
  url: string            // URL normalizada (http/https)
  interval: number       // Intervalo em ms (mínimo INTERVAL.MIN)
  saved?: boolean        // Se foi salvo (opcional)
}
```

### NewTabSchema

Schema para criação de nova aba (sem ID).

```typescript
type NewTabSchema = Omit<TabSchema, 'id'>
```

### Validação de URLs

- URLs devem ser válidas (http:// ou https://)
- URLs são normalizadas automaticamente
- Protocolos não permitidos são rejeitados

### Validação de Intervalos

- Intervalo mínimo: `INTERVAL.MIN` (definido em `@/constants`)
- Deve ser um número inteiro positivo
- Valores menores que o mínimo são ajustados automaticamente

## Tratamento de Erros

### ChromeApiError

Erro customizado para erros da Chrome API.

```typescript
class ChromeApiError extends Error {
  code?: string           // Código do erro ('RUNTIME_ERROR', 'MISSING_PERMISSIONS')
  originalError?: unknown // Erro original
}
```

### Padrão de Tratamento

1. Sempre verificar `chrome.runtime.lastError` após chamadas de API
2. Usar `promisifyChromeApi` para converter callbacks em Promises
3. Usar `safeChromeOperation` para operações que podem falhar
4. Validar permissões antes de usar APIs que as requerem

## Migrações de Dados

O sistema de migração garante compatibilidade quando a estrutura de dados muda.

### Versão Atual

Versão atual dos dados: `1`

### Processo de Migração

1. Dados são carregados do storage
2. Versão atual é verificada
3. Migrações são aplicadas sequencialmente se necessário
4. Dados migrados são validados
5. Dados migrados são salvos de volta ao storage

### Adicionar Nova Migração

1. Incrementar `CURRENT_DATA_VERSION` em `migrations.ts`
2. Criar função de migração `migrateV1ToV2`
3. Adicionar ao `getMigration` em `migrations.ts`

## Logging

O sistema de logging usa níveis configuráveis:

- `debug` - Apenas em desenvolvimento
- `info` - Apenas em desenvolvimento
- `warn` - Sempre logado
- `error` - Sempre logado

```typescript
import { logger } from '@/libs/logger'

logger.debug('Debug message')
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message')
```

