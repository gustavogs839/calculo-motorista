# Calculo Motorista

Aplicação para motoristas com controle de gastos/receitas, cadastro de plataforma (Uber, 99, Shopee, Mercado Livre, iFood), seleção de veículo (carro/moto), gráficos e geração de PDF.

## 🧩 Funcionalidades implementadas
- Cadastro de lançamentos (ganho/gasto) com descrição, valor, data, veículo e plataforma
- Edição e exclusão de lançamentos
- Filtro por mês
- Dashboard com gráficos (Doughnut e Bar)
- Cálculo de média, lucro por km, eficiência e combustível
- Seleção de plataforma com ícones e destaque visual
- Campo obrigatório de veículo (carro ou moto)
- Login com Google (Firebase Auth)
- Dados de cada usuário isolados por `userId` no Firestore
- Geração de PDF com relatório organizado
- Regras de segurança Firestore para `transacoes` protegidas

## 🚀 Execução Local
### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar em modo dev
```bash
npm run dev
```

Acesse `http://localhost:5173`.

## 🔐 Firebase
### Configuração `src/firebase.js`
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

### Regras Firestore (FIRESTORE_RULES.txt):
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transacoes/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 🔁 Migração dos dados existentes (adicionar `userId`)
- Script: `src/migrationScript.js`
- Abra `src/main.jsx` e temporariamente insira:
```js
import { migrarDadosAntigos } from './migrationScript';

migrarDadosAntigos();
```
- Execute app e verifique console
- Remova a chamada após migração

## ☁️ Deploy no GitHub Pages
1. `npm run build`
2. `npm run deploy`

(Verifique no `package.json`: script `deploy` usa `gh-pages`)

## 📄 Outras notas
- Branch principal: `main`
- Repositório: https://github.com/gustavogs839/calculo-motorista

---

Desenvolvido para gerenciamento de motorista com segurança e usabilidade. Boa sorte! :rocket:
